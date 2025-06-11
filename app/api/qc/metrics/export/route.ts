import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getAuthUser } from "@/lib/auth"
import { subDays, startOfDay, endOfDay, format } from "date-fns"

const prisma = new PrismaClient()

// GET /api/qc/metrics/export
export async function GET(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to export QC metrics
    if (!["ADMIN", "QC_PERSON", "PRODUCTION_COORDINATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    const inspector = searchParams.get("inspector") || "all"
    const productFamily = searchParams.get("productFamily") || "all"
    const exportFormat = searchParams.get("format") || "csv"

    // Calculate date range
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    // Build where clause for filtering
    const whereClause: any = {
      completedAt: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ["PASSED", "FAILED"]
      }
    }

    // Add inspector filter
    if (inspector !== "all") {
      whereClause.inspectedBy = {
        fullName: inspector
      }
    }

    // Add product family filter
    if (productFamily !== "all") {
      whereClause.order = {
        productFamily: productFamily
      }
    }

    // Fetch detailed QC results
    const qcResults = await prisma.orderQcResult.findMany({
      where: whereClause,
      include: {
        inspectedBy: {
          select: {
            fullName: true,
            email: true
          }
        },
        order: {
          select: {
            poNumber: true,
            customerName: true,
            productFamily: true
          }
        },
        template: {
          select: {
            formName: true,
            formType: true,
            version: true
          }
        },
        itemResults: {
          include: {
            templateItem: {
              select: {
                checklistItem: true,
                section: true,
                itemType: true
              }
            }
          }
        }
      },
      orderBy: {
        completedAt: "desc"
      }
    })

    if (exportFormat === "csv") {
      // Generate CSV content
      const csvHeaders = [
        "Date",
        "PO Number",
        "Customer",
        "Product Family",
        "Inspector",
        "QC Type",
        "Template Version",
        "Overall Result",
        "Inspection Time (min)",
        "Failed Items Count",
        "Failed Items",
        "Inspector Notes"
      ]

      const csvRows = qcResults.map(result => {
        const completedAt = result.completedAt ? format(new Date(result.completedAt), "yyyy-MM-dd HH:mm") : ""
        const inspectionTimeMinutes = result.startedAt && result.completedAt 
          ? ((new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()) / (1000 * 60)).toFixed(1)
          : ""
        
        const failedItems = result.itemResults.filter(item => item.passed === false)
        const failedItemsList = failedItems
          .map(item => `${item.templateItem.section}: ${item.templateItem.checklistItem}`)
          .join("; ")

        return [
          completedAt,
          result.order?.poNumber || "",
          result.order?.customerName || "",
          result.order?.productFamily || "",
          result.inspectedBy?.fullName || "",
          result.template?.formType || "",
          result.template?.version || "",
          result.overallStatus || "",
          inspectionTimeMinutes,
          failedItems.length,
          failedItemsList,
          (result.notes || "").replace(/"/g, '""') // Escape quotes for CSV
        ]
      })

      // Build CSV content
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map(row => 
          row.map(cell => `"${cell}"`).join(",")
        )
      ].join("\n")

      // Return CSV response
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="qc-metrics-${format(new Date(), "yyyy-MM-dd")}.csv"`
        }
      })
    }

    // If JSON format requested, return structured data
    return NextResponse.json({
      success: true,
      data: qcResults.map(result => ({
        id: result.id,
        completedAt: result.completedAt,
        poNumber: result.order?.poNumber,
        customerName: result.order?.customerName,
        productFamily: result.order?.productFamily,
        inspector: result.inspectedBy?.fullName,
        qcType: result.template?.formType,
        templateVersion: result.template?.version,
        overallStatus: result.overallStatus,
        inspectionTime: result.startedAt && result.completedAt 
          ? ((new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()) / (1000 * 60))
          : null,
        failedItems: result.itemResults.filter(item => item.passed === false).map(item => ({
          section: item.templateItem.section,
          checklistItem: item.templateItem.checklistItem,
          notes: item.notes
        })),
        notes: result.notes
      })),
      meta: {
        totalResults: qcResults.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days
        },
        filters: {
          inspector: inspector === "all" ? null : inspector,
          productFamily: productFamily === "all" ? null : productFamily
        }
      }
    })

  } catch (error) {
    console.error("Error exporting QC metrics:", error)
    return NextResponse.json(
      { success: false, error: "Failed to export QC metrics" },
      { status: 500 }
    )
  }
}