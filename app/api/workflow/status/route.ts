import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { startOfDay, subDays } from 'date-fns'

const prisma = new PrismaClient()

// Define workflow stages in order
const WORKFLOW_STAGES = [
  { 
    id: 'ORDER_CREATED', 
    name: 'Created', 
    description: 'New orders awaiting parts',
    color: 'blue',
    target: 'PROCUREMENT_SPECIALIST'
  },
  { 
    id: 'SINK_BODY_EXTERNAL_PRODUCTION', 
    name: 'Parts Sent', 
    description: 'Waiting for parts arrival',
    color: 'purple',
    target: 'PROCUREMENT_SPECIALIST'
  },
  { 
    id: 'READY_FOR_PRE_QC', 
    name: 'Pre-QC', 
    description: 'Ready for pre-production QC',
    color: 'yellow',
    target: 'QC_PERSON'
  },
  { 
    id: 'READY_FOR_PRODUCTION', 
    name: 'Production', 
    description: 'Ready for assembly',
    color: 'orange',
    target: 'ASSEMBLER'
  },
  { 
    id: 'TESTING_COMPLETE', 
    name: 'Testing', 
    description: 'Testing completed',
    color: 'teal',
    target: 'ASSEMBLER'
  },
  { 
    id: 'PACKAGING_COMPLETE', 
    name: 'Packaging', 
    description: 'Packaging completed',
    color: 'cyan',
    target: 'ASSEMBLER'
  },
  { 
    id: 'READY_FOR_FINAL_QC', 
    name: 'Final QC', 
    description: 'Ready for final QC',
    color: 'indigo',
    target: 'QC_PERSON'
  },
  { 
    id: 'READY_FOR_SHIP', 
    name: 'Ready to Ship', 
    description: 'Approved and ready',
    color: 'green',
    target: 'PRODUCTION_COORDINATOR'
  },
  { 
    id: 'SHIPPED', 
    name: 'Shipped', 
    description: 'Completed orders',
    color: 'gray',
    target: null
  }
]

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

    // Check if user has permission to view workflow status
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'

    // Get current order counts by status
    const orderCounts = await prisma.order.groupBy({
      by: ['orderStatus'],
      _count: {
        id: true
      },
      where: {
        orderStatus: {
          not: 'SHIPPED' // Exclude shipped orders from active workflow
        }
      }
    })

    // Get total shipped orders (for completion tracking)
    const shippedCount = await prisma.order.count({
      where: {
        orderStatus: 'SHIPPED'
      }
    })

    // Calculate stage data with bottleneck detection
    const stageData = WORKFLOW_STAGES.map(stage => {
      const count = stage.id === 'SHIPPED' 
        ? shippedCount 
        : orderCounts.find(oc => oc.orderStatus === stage.id)?._count.id || 0
      
      return {
        ...stage,
        count,
        isBottleneck: false // Will be calculated below
      }
    })

    // Bottleneck detection logic
    const activeStages = stageData.filter(s => s.id !== 'SHIPPED' && s.count > 0)
    if (activeStages.length > 0) {
      const averageCount = activeStages.reduce((sum, s) => sum + s.count, 0) / activeStages.length
      const threshold = Math.max(2, averageCount * 1.5) // 50% above average, minimum of 2

      stageData.forEach(stage => {
        if (stage.id !== 'SHIPPED' && stage.count >= threshold) {
          stage.isBottleneck = true
        }
      })
    }

    let historyData = null
    if (includeHistory) {
      // Get historical movement data (last 7 days)
      const sevenDaysAgo = startOfDay(subDays(new Date(), 7))
      
      const historyLogs = await prisma.orderHistoryLog.findMany({
        where: {
          timestamp: {
            gte: sevenDaysAgo
          },
          action: {
            in: ['ORDER_CREATED', 'ORDER_STATUS_UPDATED']
          }
        },
        select: {
          newStatus: true,
          timestamp: true,
          action: true
        },
        orderBy: {
          timestamp: 'asc'
        }
      })

      // Group by day and status
      const dailyMovement: Record<string, Record<string, number>> = {}
      
      historyLogs.forEach(log => {
        const day = log.timestamp.toISOString().split('T')[0]
        const status = log.newStatus || 'UNKNOWN'
        
        if (!dailyMovement[day]) {
          dailyMovement[day] = {}
        }
        
        dailyMovement[day][status] = (dailyMovement[day][status] || 0) + 1
      })

      historyData = {
        dailyMovement,
        totalMovements: historyLogs.length,
        timeRange: {
          from: sevenDaysAgo.toISOString(),
          to: new Date().toISOString()
        }
      }
    }

    // Get orders with assignment info for detailed view
    const detailedOrders = await prisma.order.findMany({
      where: {
        orderStatus: {
          not: 'SHIPPED'
        }
      },
      select: {
        id: true,
        poNumber: true,
        orderStatus: true,
        currentAssignee: true,
        createdAt: true,
        wantDate: true,
        customerName: true,
        buildNumbers: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit for performance
    })

    // Calculate workflow metrics
    const totalActiveOrders = orderCounts.reduce((sum, oc) => sum + oc._count.id, 0)
    const averageStageTime = calculateAverageStageTime(stageData)
    const flowEfficiency = calculateFlowEfficiency(stageData)

    return NextResponse.json({
      success: true,
      data: {
        stages: stageData,
        metrics: {
          totalActiveOrders,
          totalShippedOrders: shippedCount,
          bottleneckCount: stageData.filter(s => s.isBottleneck).length,
          averageStageTime,
          flowEfficiency
        },
        orders: detailedOrders,
        history: historyData,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching workflow status:', error)
    
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

function calculateAverageStageTime(stageData: any[]): number {
  // Simplified calculation - in real implementation, would use historical data
  const activeStages = stageData.filter(s => s.count > 0 && s.id !== 'SHIPPED')
  return activeStages.length > 0 ? 24 : 0 // Placeholder: 24 hours average
}

function calculateFlowEfficiency(stageData: any[]): number {
  const totalOrders = stageData.reduce((sum, s) => sum + s.count, 0)
  const completedOrders = stageData.find(s => s.id === 'SHIPPED')?.count || 0
  
  if (totalOrders === 0) return 100
  return Math.round((completedOrders / (totalOrders + completedOrders)) * 100)
}