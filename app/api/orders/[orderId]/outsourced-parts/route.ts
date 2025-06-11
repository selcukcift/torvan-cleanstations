import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getAuthUser } from "@/lib/auth"
import { z } from "zod"

const prisma = new PrismaClient()

// Schema for creating outsourced part
const createOutsourcedPartSchema = z.object({
  bomItemId: z.string().optional(),
  partNumber: z.string().min(1),
  partName: z.string().min(1),
  quantity: z.number().int().positive(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  expectedReturnDate: z.string().datetime().optional(),
})

// Schema for updating outsourced part
const updateOutsourcedPartSchema = z.object({
  status: z.enum(["PENDING", "SENT", "IN_PROGRESS", "RECEIVED", "CANCELLED"]).optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  expectedReturnDate: z.string().datetime().optional(),
  actualReturnDate: z.string().datetime().optional(),
})

// GET /api/orders/[orderId]/outsourced-parts
export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view procurement data
    if (!["ADMIN", "PROCUREMENT_SPECIALIST", "PRODUCTION_COORDINATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const outsourcedParts = await prisma.outsourcedPart.findMany({
      where: { orderId: params.orderId },
      include: {
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
        markedAt: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      data: outsourcedParts,
    })
  } catch (error) {
    console.error("Error fetching outsourced parts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch outsourced parts" },
      { status: 500 }
    )
  }
}

// POST /api/orders/[orderId]/outsourced-parts
export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can mark parts for outsourcing
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createOutsourcedPartSchema.parse(body)

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Create outsourced part record
    const outsourcedPart = await prisma.outsourcedPart.create({
      data: {
        orderId: params.orderId,
        bomItemId: validatedData.bomItemId,
        partNumber: validatedData.partNumber,
        partName: validatedData.partName,
        quantity: validatedData.quantity,
        supplier: validatedData.supplier,
        notes: validatedData.notes,
        expectedReturnDate: validatedData.expectedReturnDate
          ? new Date(validatedData.expectedReturnDate)
          : undefined,
        markedById: user.id,
      },
      include: {
        markedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    // Log the action
    await prisma.orderHistoryLog.create({
      data: {
        orderId: params.orderId,
        userId: user.id,
        action: "PART_MARKED_FOR_OUTSOURCING",
        notes: `Part ${validatedData.partNumber} (${validatedData.partName}) marked for outsourcing`,
      },
    })

    return NextResponse.json({
      success: true,
      data: outsourcedPart,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating outsourced part:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create outsourced part" },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[orderId]/outsourced-parts
export async function PUT(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can update outsourced parts
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const outsourcedPartId = searchParams.get("id")

    if (!outsourcedPartId) {
      return NextResponse.json(
        { error: "Outsourced part ID is required" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateOutsourcedPartSchema.parse(body)

    // Verify outsourced part exists and belongs to the order
    const existingPart = await prisma.outsourcedPart.findFirst({
      where: {
        id: outsourcedPartId,
        orderId: params.orderId,
      },
    })

    if (!existingPart) {
      return NextResponse.json(
        { error: "Outsourced part not found" },
        { status: 404 }
      )
    }

    // Update outsourced part
    const updatedPart = await prisma.outsourcedPart.update({
      where: { id: outsourcedPartId },
      data: {
        status: validatedData.status,
        supplier: validatedData.supplier,
        notes: validatedData.notes,
        expectedReturnDate: validatedData.expectedReturnDate
          ? new Date(validatedData.expectedReturnDate)
          : undefined,
        actualReturnDate: validatedData.actualReturnDate
          ? new Date(validatedData.actualReturnDate)
          : undefined,
      },
      include: {
        markedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    // Log status changes
    if (validatedData.status && validatedData.status !== existingPart.status) {
      await prisma.orderHistoryLog.create({
        data: {
          orderId: params.orderId,
          userId: user.id,
          action: "OUTSOURCED_PART_STATUS_UPDATED",
          oldStatus: existingPart.status,
          newStatus: validatedData.status,
          notes: `Part ${existingPart.partNumber} status changed from ${existingPart.status} to ${validatedData.status}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedPart,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating outsourced part:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update outsourced part" },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[orderId]/outsourced-parts
export async function DELETE(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can delete outsourced parts
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const outsourcedPartId = searchParams.get("id")

    if (!outsourcedPartId) {
      return NextResponse.json(
        { error: "Outsourced part ID is required" },
        { status: 400 }
      )
    }

    // Verify outsourced part exists and belongs to the order
    const existingPart = await prisma.outsourcedPart.findFirst({
      where: {
        id: outsourcedPartId,
        orderId: params.orderId,
      },
    })

    if (!existingPart) {
      return NextResponse.json(
        { error: "Outsourced part not found" },
        { status: 404 }
      )
    }

    // Delete the outsourced part
    await prisma.outsourcedPart.delete({
      where: { id: outsourcedPartId },
    })

    // Log the action
    await prisma.orderHistoryLog.create({
      data: {
        orderId: params.orderId,
        userId: user.id,
        action: "OUTSOURCED_PART_REMOVED",
        notes: `Part ${existingPart.partNumber} (${existingPart.partName}) removed from outsourcing`,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Outsourced part removed successfully",
    })
  } catch (error) {
    console.error("Error deleting outsourced part:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete outsourced part" },
      { status: 500 }
    )
  }
}