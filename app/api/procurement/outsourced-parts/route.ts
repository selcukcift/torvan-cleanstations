import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/procurement/outsourced-parts
export async function GET(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can view all outsourced parts
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supplier = searchParams.get("supplier")
    const orderBy = searchParams.get("orderBy") || "markedAt"
    const order = searchParams.get("order") || "desc"

    // Build where clause
    const where: any = {}
    if (status) {
      where.status = status
    }
    if (supplier) {
      where.supplier = {
        contains: supplier,
        mode: "insensitive",
      }
    }

    // Get all outsourced parts across all orders
    const outsourcedParts = await prisma.outsourcedPart.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            poNumber: true,
            customerName: true,
            wantDate: true,
            orderStatus: true,
          },
        },
        markedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        bomItem: true,
      },
      orderBy: {
        [orderBy]: order,
      },
    })

    // Calculate statistics
    const stats = {
      total: outsourcedParts.length,
      pending: outsourcedParts.filter((p) => p.status === "PENDING").length,
      sent: outsourcedParts.filter((p) => p.status === "SENT").length,
      inProgress: outsourcedParts.filter((p) => p.status === "IN_PROGRESS").length,
      received: outsourcedParts.filter((p) => p.status === "RECEIVED").length,
      cancelled: outsourcedParts.filter((p) => p.status === "CANCELLED").length,
      totalQuantity: outsourcedParts.reduce((sum, p) => sum + p.quantity, 0),
      uniqueSuppliers: [...new Set(outsourcedParts.map((p) => p.supplier).filter(Boolean))],
      overdueCount: outsourcedParts.filter(
        (p) =>
          p.expectedReturnDate &&
          new Date(p.expectedReturnDate) < new Date() &&
          !["RECEIVED", "CANCELLED"].includes(p.status)
      ).length,
    }

    return NextResponse.json({
      success: true,
      data: outsourcedParts,
      stats,
    })
  } catch (error) {
    console.error("Error fetching all outsourced parts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch outsourced parts" },
      { status: 500 }
    )
  }
}

// POST /api/procurement/outsourced-parts/bulk-update
export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can bulk update
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { ids, status, supplier, notes } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs array is required" },
        { status: 400 }
      )
    }

    // Perform bulk update
    const updated = await prisma.outsourcedPart.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        ...(status && { status }),
        ...(supplier !== undefined && { supplier }),
        ...(notes !== undefined && { notes }),
        ...(status === "RECEIVED" && { actualReturnDate: new Date() }),
      },
    })

    // Log bulk action
    const affectedParts = await prisma.outsourcedPart.findMany({
      where: { id: { in: ids } },
      include: { order: true },
    })

    // Group by order for logging
    const orderGroups = affectedParts.reduce((acc, part) => {
      if (!acc[part.orderId]) {
        acc[part.orderId] = []
      }
      acc[part.orderId].push(part)
      return acc
    }, {} as Record<string, typeof affectedParts>)

    // Create history logs for each affected order
    for (const [orderId, parts] of Object.entries(orderGroups)) {
      await prisma.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: "OUTSOURCED_PARTS_BULK_UPDATE",
          notes: `Bulk updated ${parts.length} outsourced parts: ${
            status ? `status to ${status}` : ""
          } ${supplier !== undefined ? `supplier to ${supplier || "none"}` : ""}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated.count} outsourced parts`,
      count: updated.count,
    })
  } catch (error) {
    console.error("Error bulk updating outsourced parts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to bulk update outsourced parts" },
      { status: 500 }
    )
  }
}

// GET /api/procurement/outsourced-parts/export
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can export
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "csv"

    // Get all outsourced parts
    const outsourcedParts = await prisma.outsourcedPart.findMany({
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            wantDate: true,
          },
        },
        markedBy: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: [
        { supplier: "asc" },
        { status: "asc" },
        { markedAt: "desc" },
      ],
    })

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "PO Number",
        "Customer",
        "Part Number",
        "Part Name",
        "Quantity",
        "Supplier",
        "Status",
        "Expected Return",
        "Actual Return",
        "Notes",
        "Want Date",
        "Marked By",
        "Marked Date",
      ]

      const rows = outsourcedParts.map((part) => [
        part.order.poNumber,
        part.order.customerName,
        part.partNumber,
        part.partName,
        part.quantity.toString(),
        part.supplier || "",
        part.status,
        part.expectedReturnDate ? new Date(part.expectedReturnDate).toLocaleDateString() : "",
        part.actualReturnDate ? new Date(part.actualReturnDate).toLocaleDateString() : "",
        part.notes || "",
        new Date(part.order.wantDate).toLocaleDateString(),
        part.markedBy.fullName,
        new Date(part.markedAt).toLocaleDateString(),
      ])

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="outsourced-parts-${new Date()
            .toISOString()
            .split("T")[0]}.csv"`,
        },
      })
    }

    return NextResponse.json(
      { error: "Unsupported format" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error exporting outsourced parts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to export outsourced parts" },
      { status: 500 }
    )
  }
}