import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { startOfDay, subDays } from 'date-fns'
import { prisma } from '@/lib/prisma'

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

    // Check if user has permission to view QC status
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR' && user.role !== 'QC_PERSON') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeTrends = searchParams.get('includeTrends') === 'true'

    // Get orders in QC-related statuses
    const qcOrders = await prisma.order.findMany({
      where: {
        orderStatus: {
          in: ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC']
        }
      },
      include: {
        createdBy: {
          select: { fullName: true }
        },
        qcResults: {
          include: {
            qcFormTemplate: {
              select: { name: true, appliesToProductFamily: true }
            },
            qcPerformedBy: {
              select: { fullName: true, initials: true }
            }
          },
          orderBy: { qcTimestamp: 'desc' }
        }
      },
      orderBy: {
        createdAt: 'asc' // Oldest first for queue priority
      }
    })

    // Separate by QC type
    const preQcOrders = qcOrders.filter(order => order.orderStatus === 'READY_FOR_PRE_QC')
    const finalQcOrders = qcOrders.filter(order => order.orderStatus === 'READY_FOR_FINAL_QC')

    // Get completed QC results for the last 7 days
    const sevenDaysAgo = startOfDay(subDays(new Date(), 7))
    const recentQcResults = await prisma.orderQcResult.findMany({
      where: {
        qcTimestamp: {
          gte: sevenDaysAgo
        }
      },
      include: {
        order: {
          select: { 
            poNumber: true, 
            customerName: true,
            orderStatus: true
          }
        },
        qcFormTemplate: {
          select: { name: true, appliesToProductFamily: true }
        },
        qcPerformedBy: {
          select: { fullName: true, initials: true }
        }
      },
      orderBy: {
        qcTimestamp: 'desc'
      }
    })

    // Calculate QC metrics
    const totalQcResults = recentQcResults.length
    const passedQc = recentQcResults.filter(result => result.overallStatus === 'PASS').length
    const failedQc = recentQcResults.filter(result => result.overallStatus === 'FAIL').length
    const qcPassRate = totalQcResults > 0 ? Math.round((passedQc / totalQcResults) * 100) : 0

    // Group by QC person
    const qcPersonWorkload = await prisma.user.findMany({
      where: {
        role: 'QC_PERSON',
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        initials: true,
        _count: {
          select: {
            qcResults: true
          }
        }
      }
    })

    // Calculate average wait times
    const avgWaitTimes = calculateAverageWaitTimes(qcOrders)

    // Get failed QC items that need attention
    const failedQcItems = recentQcResults
      .filter(result => result.overallStatus === 'FAIL')
      .slice(0, 10) // Limit to most recent 10 failures

    let trendData = null
    if (includeTrends) {
      // Daily QC completion trends
      const dailyQcTrends = recentQcResults.reduce((acc, result) => {
        const date = result.qcTimestamp.toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { total: 0, passed: 0, failed: 0 }
        }
        acc[date].total++
        if (result.overallStatus === 'PASS') {
          acc[date].passed++
        } else if (result.overallStatus === 'FAIL') {
          acc[date].failed++
        }
        return acc
      }, {} as Record<string, { total: number; passed: number; failed: number }>)

      trendData = {
        dailyTrends: dailyQcTrends,
        averagePassRate: qcPassRate
      }
    }

    // Priority alerts
    const priorityAlerts = []

    // Alert for orders waiting too long
    const oldPreQcOrders = preQcOrders.filter(order => {
      const daysSinceCreated = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreated > 2 // More than 2 days waiting
    })

    const oldFinalQcOrders = finalQcOrders.filter(order => {
      const daysSinceReady = Math.floor((Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceReady > 1 // More than 1 day waiting for final QC
    })

    if (oldPreQcOrders.length > 0) {
      priorityAlerts.push({
        type: 'warning',
        message: `${oldPreQcOrders.length} order(s) have been waiting for Pre-QC for more than 2 days`,
        action: 'REVIEW_PRE_QC',
        count: oldPreQcOrders.length
      })
    }

    if (oldFinalQcOrders.length > 0) {
      priorityAlerts.push({
        type: 'warning',
        message: `${oldFinalQcOrders.length} order(s) have been waiting for Final QC for more than 1 day`,
        action: 'REVIEW_FINAL_QC',
        count: oldFinalQcOrders.length
      })
    }

    if (qcPassRate < 85 && totalQcResults >= 5) {
      priorityAlerts.push({
        type: 'error',
        message: `QC pass rate is low (${qcPassRate}%) - consider investigating quality issues`,
        action: 'REVIEW_FAILURES',
        count: failedQc
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          preQcQueue: preQcOrders.length,
          finalQcQueue: finalQcOrders.length,
          totalQcResults,
          qcPassRate,
          passedQc,
          failedQc,
          avgWaitTimes
        },
        queues: {
          preQc: preQcOrders.slice(0, 10), // Limit for display
          finalQc: finalQcOrders.slice(0, 10)
        },
        qcPersonWorkload,
        failedQcItems,
        priorityAlerts,
        trends: trendData,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching QC status overview:', error)
    
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

function calculateAverageWaitTimes(orders: any[]): { preQc: number; finalQc: number } {
  const now = Date.now()
  
  const preQcOrders = orders.filter(o => o.orderStatus === 'READY_FOR_PRE_QC')
  const finalQcOrders = orders.filter(o => o.orderStatus === 'READY_FOR_FINAL_QC')
  
  const avgPreQcWait = preQcOrders.length > 0 
    ? preQcOrders.reduce((sum, order) => {
        return sum + Math.floor((now - new Date(order.createdAt).getTime()) / (1000 * 60 * 60))
      }, 0) / preQcOrders.length
    : 0
    
  const avgFinalQcWait = finalQcOrders.length > 0
    ? finalQcOrders.reduce((sum, order) => {
        return sum + Math.floor((now - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60))
      }, 0) / finalQcOrders.length
    : 0
  
  return {
    preQc: Math.round(avgPreQcWait),
    finalQc: Math.round(avgFinalQcWait)
  }
}