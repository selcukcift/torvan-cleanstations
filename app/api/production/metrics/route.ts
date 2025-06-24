import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to view production metrics
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    // Get date range
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    // Fetch production metrics from database
    const existingMetrics = await prisma.productionMetrics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // If we have recent metrics, return them
    if (existingMetrics.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingMetrics
      })
    }

    // Generate metrics from order data
    const orders = await prisma.order.findMany({
      where: {
        orderStatus: {
          in: ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE', 'READY_FOR_FINAL_QC', 'SHIPPED']
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        productionChecklists: true,
        productionTasks: true
      }
    })

    // Calculate daily metrics
    const dailyMetrics = []
    for (let i = 0; i < days; i++) {
      const currentDate = subDays(new Date(), i)
      const dayStart = startOfDay(currentDate)
      const dayEnd = endOfDay(currentDate)

      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= dayStart && orderDate <= dayEnd
      })

      const ordersStarted = dayOrders.filter(o => 
        o.orderStatus === 'READY_FOR_PRODUCTION'
      ).length

      const ordersCompleted = dayOrders.filter(o => {
        return o.productionChecklists?.some(c => 
          c.status === 'COMPLETED' && 
          c.completedAt &&
          new Date(c.completedAt) >= dayStart &&
          new Date(c.completedAt) <= dayEnd
        )
      }).length

      // Calculate average task time by category
      const avgTaskTime: Record<string, number> = {}
      const tasksByCategory = dayOrders.reduce((acc, order) => {
        order.productionTasks?.forEach(task => {
          if (!acc[task.category]) {
            acc[task.category] = []
          }
          if (task.actualTime) {
            acc[task.category].push(task.actualTime)
          }
        })
        return acc
      }, {} as Record<string, number[]>)

      Object.entries(tasksByCategory).forEach(([category, times]) => {
        if (times.length > 0) {
          avgTaskTime[category] = times.reduce((sum, time) => sum + time, 0) / times.length
        }
      })

      // Calculate cycle time
      const completedOrders = dayOrders.filter(o => o.orderStatus === 'SHIPPED')
      let avgCycleTime: number | undefined
      if (completedOrders.length > 0) {
        const totalCycleTime = completedOrders.reduce((total, order) => {
          const start = new Date(order.createdAt)
          const end = new Date(order.updatedAt)
          return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60) // hours
        }, 0)
        avgCycleTime = totalCycleTime / completedOrders.length
      }

      // Calculate quality score
      const totalTasks = dayOrders.reduce((total, order) => 
        total + (order.productionTasks?.length || 0), 0
      )
      const completedTasks = dayOrders.reduce((total, order) => 
        total + (order.productionTasks?.filter(t => t.completed).length || 0), 0
      )
      const qualityScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : undefined

      // Identify bottlenecks
      const bottlenecks: Record<string, any> = {}
      const pendingTasks = dayOrders.reduce((acc, order) => {
        order.productionTasks?.forEach(task => {
          if (!task.completed) {
            if (!acc[task.category]) {
              acc[task.category] = 0
            }
            acc[task.category]++
          }
        })
        return acc
      }, {} as Record<string, number>)

      // Find categories with most pending tasks
      const sortedBottlenecks = Object.entries(pendingTasks)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)

      if (sortedBottlenecks.length > 0) {
        bottlenecks.categories = sortedBottlenecks.map(([category, count]) => ({
          category,
          pendingTasks: count
        }))
      }

      dailyMetrics.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        ordersStarted,
        ordersCompleted,
        avgCycleTime,
        avgTaskTime,
        bottlenecks,
        qualityScore
      })
    }

    return NextResponse.json({
      success: true,
      data: dailyMetrics.reverse() // Most recent first
    })

  } catch (error) {
    console.error('Error fetching production metrics:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins and production coordinators can create/update metrics
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { date, ordersStarted, ordersCompleted, avgCycleTime, avgTaskTime, bottlenecks, qualityScore } = body

    // Upsert production metrics for the date
    const metrics = await prisma.productionMetrics.upsert({
      where: {
        date: new Date(date)
      },
      update: {
        ordersStarted: ordersStarted || 0,
        ordersCompleted: ordersCompleted || 0,
        avgCycleTime,
        avgTaskTime: avgTaskTime || {},
        bottlenecks: bottlenecks || {},
        qualityScore
      },
      create: {
        date: new Date(date),
        ordersStarted: ordersStarted || 0,
        ordersCompleted: ordersCompleted || 0,
        avgCycleTime,
        avgTaskTime: avgTaskTime || {},
        bottlenecks: bottlenecks || {},
        qualityScore
      }
    })

    return NextResponse.json({
      success: true,
      data: metrics,
      message: 'Production metrics updated successfully'
    })

  } catch (error) {
    console.error('Error updating production metrics:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}