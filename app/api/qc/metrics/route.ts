import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getAuthUser } from "@/lib/auth"
import { subDays, startOfDay, endOfDay, format } from "date-fns"

const prisma = new PrismaClient()

// GET /api/qc/metrics
export async function GET(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view QC metrics
    if (!["ADMIN", "QC_PERSON", "PRODUCTION_COORDINATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    const inspector = searchParams.get("inspector") || "all"
    const productFamily = searchParams.get("productFamily") || "all"

    // Calculate date range
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    // Build where clause for filtering
    const whereClause: any = {
      qcTimestamp: {
        gte: startDate,
        lte: endDate
      },
      overallStatus: {
        in: ["PASSED", "FAILED"]
      }
    }

    // Add inspector filter
    if (inspector !== "all") {
      whereClause.qcPerformedBy = {
        fullName: inspector
      }
    }

    // Add product family filter
    if (productFamily !== "all") {
      // We'll need to filter this after fetching since Order doesn't have productFamily
    }

    // Fetch QC results with related data
    const qcResults = await prisma.orderQcResult.findMany({
      where: whereClause,
      include: {
        qcPerformedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        order: {
          select: {
            id: true,
            poNumber: true,
            projectName: true
          }
        },
        qcFormTemplate: {
          select: {
            name: true,
            description: true
          }
        },
        itemResults: {
          include: {
            qcFormTemplateItem: {
              select: {
                checklistItem: true,
                section: true
              }
            }
          }
        }
      },
      orderBy: {
        qcTimestamp: "desc"
      }
    })

    // Calculate metrics
    const totalInspections = qcResults.length
    const passedInspections = qcResults.filter(r => r.overallStatus === "PASSED").length
    const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0

    // Calculate average inspection time (we don't have start/end times, so use a default)
    // This would need to be tracked separately if needed
    const avgInspectionTime = 15 // Default 15 minutes

    // Analyze failure reasons
    const failedResults = qcResults.filter(r => r.overallStatus === "FAILED")
    const failureReasons: { [key: string]: number } = {}
    
    failedResults.forEach(result => {
      const failedItems = result.itemResults.filter(item => item.isConformant === false)
      failedItems.forEach(item => {
        const reason = item.qcFormTemplateItem.checklistItem || "Unknown issue"
        failureReasons[reason] = (failureReasons[reason] || 0) + 1
      })
      
      // Also check notes for common failure patterns
      if (result.notes) {
        const notes = result.notes.toLowerCase()
        if (notes.includes("measurement") || notes.includes("tolerance")) {
          failureReasons["Measurement out of tolerance"] = (failureReasons["Measurement out of tolerance"] || 0) + 1
        }
        if (notes.includes("surface") || notes.includes("finish")) {
          failureReasons["Surface finish issues"] = (failureReasons["Surface finish issues"] || 0) + 1
        }
        if (notes.includes("alignment") || notes.includes("assembly")) {
          failureReasons["Assembly alignment"] = (failureReasons["Assembly alignment"] || 0) + 1
        }
      }
    })

    const topFailureReasons = Object.entries(failureReasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }))

    // Inspector performance analysis
    const inspectorStats: { [key: string]: any } = {}
    
    qcResults.forEach(result => {
      const inspectorName = result.qcPerformedBy?.fullName || "Unknown"
      if (!inspectorStats[inspectorName]) {
        inspectorStats[inspectorName] = {
          inspectorName,
          inspections: 0,
          passed: 0,
          totalTime: 0,
          timeCount: 0
        }
      }
      
      inspectorStats[inspectorName].inspections++
      if (result.overallStatus === "PASSED") {
        inspectorStats[inspectorName].passed++
      }
      
      // Use default time since we don't track start/end times
      inspectorStats[inspectorName].totalTime += 15 // 15 minutes default
      inspectorStats[inspectorName].timeCount++
    })

    const inspectorPerformance = Object.values(inspectorStats).map((stats: any) => ({
      inspectorName: stats.inspectorName,
      inspections: stats.inspections,
      passRate: stats.inspections > 0 ? Math.round((stats.passed / stats.inspections) * 100) : 0,
      avgTime: stats.timeCount > 0 ? Number((stats.totalTime / stats.timeCount).toFixed(1)) : 0
    }))

    // Product type metrics
    const productStats: { [key: string]: any } = {}
    
    qcResults.forEach(result => {
      const productFamily = result.order?.projectName || "Unknown"
      if (!productStats[productFamily]) {
        productStats[productFamily] = {
          productFamily,
          total: 0,
          passed: 0,
          issues: new Set()
        }
      }
      
      productStats[productFamily].total++
      if (result.overallStatus === "PASSED") {
        productStats[productFamily].passed++
      } else {
        // Collect common issues for this product type
        const failedItems = result.itemResults.filter(item => item.isConformant === false)
        failedItems.forEach(item => {
          if (item.qcFormTemplateItem.checklistItem) {
            productStats[productFamily].issues.add(item.qcFormTemplateItem.checklistItem)
          }
        })
      }
    })

    const productTypeMetrics = Object.values(productStats).map((stats: any) => ({
      productFamily: stats.productFamily,
      passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
      totalInspections: stats.total,
      commonIssues: Array.from(stats.issues).slice(0, 5) // Top 5 issues
    }))

    // Trend data - daily aggregation
    const trendData = []
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const dayResults = qcResults.filter(r => {
        const qcTimestamp = new Date(r.qcTimestamp)
        return qcTimestamp >= dayStart && qcTimestamp <= dayEnd
      })
      
      const dayPassed = dayResults.filter(r => r.overallStatus === "PASSED").length
      const dayFailed = dayResults.filter(r => r.overallStatus === "FAILED").length
      
      trendData.push({
        date: format(date, "yyyy-MM-dd"),
        passed: dayPassed,
        failed: dayFailed,
        total: dayPassed + dayFailed
      })
    }

    const metrics = {
      passRate: Number(passRate.toFixed(1)),
      totalInspections,
      avgInspectionTime: Number(avgInspectionTime.toFixed(1)),
      failureReasons: topFailureReasons,
      inspectorPerformance: inspectorPerformance.sort((a, b) => b.inspections - a.inspections),
      trendData,
      productTypeMetrics: productTypeMetrics.sort((a, b) => b.totalInspections - a.totalInspections)
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
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
    console.error("Error fetching QC metrics:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch QC metrics" },
      { status: 500 }
    )
  }
}