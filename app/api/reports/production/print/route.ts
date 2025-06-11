/**
 * Print-friendly Production Report API
 * Generates formatted reports suitable for printing
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user can access production reports
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const period = searchParams.get('period') || 'week'
    
    // Calculate date range
    const now = new Date()
    let dateFrom: Date
    let dateTo: Date
    
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

    // Base query for orders in the period
    const ordersInPeriod = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      include: {
        createdBy: {
          select: {
            fullName: true,
            role: true
          }
        },
        historyLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let reportData: any = {
      title: '',
      period: period,
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        fromFormatted: format(dateFrom, 'PPP'),
        toFormatted: format(dateTo, 'PPP')
      },
      generatedAt: new Date().toISOString(),
      generatedBy: {
        name: user.fullName,
        role: user.role
      },
      orders: ordersInPeriod
    }

    switch (reportType) {
      case 'summary':
        reportData.title = `Production Summary Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`
        reportData.summary = await generateSummaryReport(ordersInPeriod, dateFrom, dateTo)
        break
        
      case 'completion':
        reportData.title = `Completion Rate Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`
        reportData.completion = await generateCompletionReport(ordersInPeriod, dateFrom, dateTo)
        break
        
      case 'cycle-times':
        reportData.title = `Cycle Times Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`
        reportData.cycleTimes = await generateCycleTimesReport(ordersInPeriod, dateFrom, dateTo)
        break
        
      default:
        reportData.title = `Production Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`
        reportData.summary = await generateSummaryReport(ordersInPeriod, dateFrom, dateTo)
    }

    return NextResponse.json({
      success: true,
      data: reportData
    })

  } catch (error) {
    console.error('Error generating print report:', error)
    
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

async function generateSummaryReport(orders: any[], dateFrom: Date, dateTo: Date) {
  const totalOrders = orders.length
  const statusDistribution = orders.reduce((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1
    return acc
  }, {})
  
  const assignmentDistribution = {
    assigned: orders.filter(o => o.currentAssignee).length,
    unassigned: orders.filter(o => !o.currentAssignee).length
  }
  
  const customerDistribution = orders.reduce((acc, order) => {
    acc[order.customerName] = (acc[order.customerName] || 0) + 1
    return acc
  }, {})
  
  // Calculate average orders per day in the period
  const daysDiff = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))
  const averageOrdersPerDay = Math.round((totalOrders / daysDiff) * 10) / 10
  
  return {
    totalOrders,
    averageOrdersPerDay,
    statusDistribution,
    assignmentDistribution,
    customerDistribution,
    topCustomers: Object.entries(customerDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([customer, count]) => ({ customer, count }))
  }
}

async function generateCompletionReport(orders: any[], dateFrom: Date, dateTo: Date) {
  const totalOrders = orders.length
  const completedOrders = orders.filter(o => o.orderStatus === 'SHIPPED')
  const totalCompleted = completedOrders.length
  
  const completionRate = totalOrders > 0 ? Math.round((totalCompleted / totalOrders) * 100) : 0
  
  // Calculate average completions per period
  const daysDiff = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))
  const averageCompletionsPerPeriod = Math.round((totalCompleted / daysDiff) * 10) / 10
  
  return {
    totalOrders,
    totalCompleted,
    completionRate,
    averageCompletionsPerPeriod,
    pendingOrders: totalOrders - totalCompleted
  }
}

async function generateCycleTimesReport(orders: any[], dateFrom: Date, dateTo: Date) {
  // Only analyze completed orders for accurate cycle times
  const completedOrders = orders.filter(o => o.orderStatus === 'SHIPPED')
  
  let cycleTimes: number[] = []
  let fastestOrder: any = null
  let slowestOrder: any = null
  
  for (const order of completedOrders) {
    const createdAt = new Date(order.createdAt)
    const shippedLog = order.historyLogs?.find((log: any) => log.newStatus === 'SHIPPED')
    
    if (shippedLog) {
      const shippedAt = new Date(shippedLog.timestamp)
      const cycleTimeHours = (shippedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      
      cycleTimes.push(cycleTimeHours)
      
      if (!fastestOrder || cycleTimeHours < fastestOrder.totalCycleTimeHours) {
        fastestOrder = {
          ...order,
          totalCycleTimeHours: cycleTimeHours
        }
      }
      
      if (!slowestOrder || cycleTimeHours > slowestOrder.totalCycleTimeHours) {
        slowestOrder = {
          ...order,
          totalCycleTimeHours: cycleTimeHours
        }
      }
    }
  }
  
  const averageTotalCycleTime = cycleTimes.length > 0 
    ? Math.round((cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length) * 10) / 10
    : 0
  
  return {
    totalOrdersAnalyzed: cycleTimes.length,
    averageTotalCycleTime,
    fastestOrder,
    slowestOrder,
    cycleTimes: cycleTimes.map(time => Math.round(time * 10) / 10)
  }
}