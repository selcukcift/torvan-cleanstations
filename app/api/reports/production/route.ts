import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to view production reports
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary' // summary, completion, cycle-times
    const period = searchParams.get('period') || 'week' // day, week, month
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range
    let dateFrom: Date
    let dateTo: Date

    if (startDate && endDate) {
      dateFrom = startOfDay(new Date(startDate))
      dateTo = endOfDay(new Date(endDate))
    } else {
      const now = new Date()
      switch (period) {
        case 'day':
          dateFrom = startOfDay(now)
          dateTo = endOfDay(now)
          break
        case 'week':
          dateFrom = startOfWeek(now)
          dateTo = endOfWeek(now)
          break
        case 'month':
          dateFrom = startOfMonth(now)
          dateTo = endOfMonth(now)
          break
        default:
          dateFrom = startOfWeek(now)
          dateTo = endOfWeek(now)
      }
    }

    let reportData: any = {}

    switch (reportType) {
      case 'summary':
        reportData = await generateSummaryReport(dateFrom, dateTo)
        break
      case 'completion':
        reportData = await generateCompletionReport(dateFrom, dateTo, period)
        break
      case 'cycle-times':
        reportData = await generateCycleTimesReport(dateFrom, dateTo)
        break
      default:
        reportData = await generateSummaryReport(dateFrom, dateTo)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...reportData,
        reportType,
        period,
        dateRange: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString()
        },
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: user.id,
          name: user.fullName
        }
      }
    })

  } catch (error) {
    console.error('Error generating production report:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateSummaryReport(dateFrom: Date, dateTo: Date) {
  // Get orders in date range
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: dateFrom,
        lte: dateTo
      }
    },
    include: {
      createdBy: {
        select: { fullName: true, role: true }
      },
      historyLogs: {
        where: {
          timestamp: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        orderBy: { timestamp: 'desc' }
      }
    }
  })

  // Status distribution
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Assignment distribution
  const assignmentCounts = orders.reduce((acc, order) => {
    const key = order.currentAssignee ? 'assigned' : 'unassigned'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Daily creation trend
  const dailyCreation = await prisma.order.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: {
        gte: dateFrom,
        lte: dateTo
      }
    },
    _count: {
      id: true
    }
  })

  // Process daily data
  const dailyTrend = dailyCreation.reduce((acc, item) => {
    const date = new Date(item.createdAt).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + item._count.id
    return acc
  }, {} as Record<string, number>)

  return {
    summary: {
      totalOrders: orders.length,
      statusDistribution: statusCounts,
      assignmentDistribution: assignmentCounts,
      averageOrdersPerDay: Math.round(orders.length / Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))),
      dailyTrend
    },
    orders
  }
}

async function generateCompletionReport(dateFrom: Date, dateTo: Date, period: string) {
  // Get completed orders (status SHIPPED)
  const completedOrders = await prisma.order.findMany({
    where: {
      orderStatus: 'SHIPPED',
      updatedAt: {
        gte: dateFrom,
        lte: dateTo
      }
    },
    include: {
      historyLogs: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })

  // Get all orders for completion rate calculation
  const allOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: dateFrom,
        lte: dateTo
      }
    }
  })

  // Calculate completion rate
  const completionRate = allOrders.length > 0 ? (completedOrders.length / allOrders.length) * 100 : 0

  // Group completions by period
  let groupedCompletions: Record<string, number> = {}
  
  completedOrders.forEach(order => {
    let key: string
    const date = new Date(order.updatedAt)
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = startOfWeek(date)
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }
    
    groupedCompletions[key] = (groupedCompletions[key] || 0) + 1
  })

  return {
    completion: {
      totalCompleted: completedOrders.length,
      totalOrders: allOrders.length,
      completionRate: Math.round(completionRate * 100) / 100,
      completionsByPeriod: groupedCompletions,
      averageCompletionsPerPeriod: Object.keys(groupedCompletions).length > 0 
        ? Math.round(completedOrders.length / Object.keys(groupedCompletions).length)
        : 0
    },
    completedOrders
  }
}

async function generateCycleTimesReport(dateFrom: Date, dateTo: Date) {
  // Get completed orders with history
  const completedOrders = await prisma.order.findMany({
    where: {
      orderStatus: 'SHIPPED',
      updatedAt: {
        gte: dateFrom,
        lte: dateTo
      }
    },
    include: {
      historyLogs: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })

  const cycleTimes: any[] = []
  const stageAverages: Record<string, { total: number; count: number }> = {}

  completedOrders.forEach(order => {
    const logs = order.historyLogs
    let previousTime = new Date(order.createdAt)
    let totalCycleTime = 0
    const stageTimes: Record<string, number> = {}

    logs.forEach(log => {
      const currentTime = new Date(log.timestamp)
      const stageTime = currentTime.getTime() - previousTime.getTime()
      const stageTimeHours = stageTime / (1000 * 60 * 60)

      if (log.newStatus && log.newStatus !== 'ORDER_CREATED') {
        stageTimes[log.newStatus] = stageTimeHours
        totalCycleTime += stageTimeHours

        // Track for averages
        if (!stageAverages[log.newStatus]) {
          stageAverages[log.newStatus] = { total: 0, count: 0 }
        }
        stageAverages[log.newStatus].total += stageTimeHours
        stageAverages[log.newStatus].count += 1
      }

      previousTime = currentTime
    })

    cycleTimes.push({
      orderId: order.id,
      poNumber: order.poNumber,
      totalCycleTimeHours: totalCycleTime,
      stageTimes,
      createdAt: order.createdAt,
      completedAt: logs[logs.length - 1]?.timestamp || order.updatedAt
    })
  })

  // Calculate averages
  const averageStageTime: Record<string, number> = {}
  Object.keys(stageAverages).forEach(stage => {
    const avg = stageAverages[stage]
    averageStageTime[stage] = Math.round((avg.total / avg.count) * 100) / 100
  })

  const averageTotalCycleTime = cycleTimes.length > 0
    ? Math.round((cycleTimes.reduce((sum, ct) => sum + ct.totalCycleTimeHours, 0) / cycleTimes.length) * 100) / 100
    : 0

  return {
    cycleTimes: {
      orders: cycleTimes,
      averageTotalCycleTime,
      averageStageTime,
      totalOrdersAnalyzed: cycleTimes.length,
      fastestOrder: cycleTimes.sort((a, b) => a.totalCycleTimeHours - b.totalCycleTimeHours)[0] || null,
      slowestOrder: cycleTimes.sort((a, b) => b.totalCycleTimeHours - a.totalCycleTimeHours)[0] || null
    }
  }
}