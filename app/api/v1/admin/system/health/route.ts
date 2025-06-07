import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createStandardAPIResponse, createStandardErrorResponse } from '@/lib/apiResponse'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Only admins and production coordinators can view detailed system health
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return createStandardErrorResponse('FORBIDDEN', 'Insufficient permissions to view system health', 403)
    }

    const startTime = Date.now()

    // Get system statistics
    const [
      userStats,
      orderStats,
      partStats,
      assemblyStats,
      taskStats,
      recentActivity
    ] = await Promise.all([
      // User statistics
      prisma.user.groupBy({
        by: ['role', 'isActive'],
        _count: true
      }),
      
      // Order statistics
      prisma.order.groupBy({
        by: ['orderStatus'],
        _count: true
      }),
      
      // Parts statistics
      prisma.part.aggregate({
        _count: true
      }),
      
      // Assembly statistics
      prisma.assembly.aggregate({
        _count: true
      }),
      
      // Task statistics
      prisma.task.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Recent activity (last 24 hours)
      prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        take: 50,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              fullName: true,
              role: true
            }
          }
        }
      })
    ])

    // Calculate low stock parts (using InventoryItem model)
    const lowStockInventory = await prisma.inventoryItem.findMany({
      where: {
        reorderPoint: { not: null }
      },
      select: {
        quantityOnHand: true,
        reorderPoint: true
      }
    })
    
    const lowStockParts = lowStockInventory.filter(item => 
      item.quantityOnHand <= (item.reorderPoint || 0)
    ).length

    // Calculate parts that are out of stock
    const outOfStockParts = await prisma.inventoryItem.count({
      where: {
        quantityOnHand: 0
      }
    })

    // Get pending orders count
    const pendingOrders = await prisma.order.count({
      where: {
        orderStatus: {
          in: ['ORDER_CREATED', 'READY_FOR_PRE_QC', 'READY_FOR_PRODUCTION']
        }
      }
    })

    // Get active tasks (not completed)
    const activeTasks = await prisma.task.count({
      where: {
        status: {
          in: ['IN_PROGRESS', 'PENDING', 'BLOCKED']
        }
      }
    })

    // Calculate system performance metrics
    const responseTime = Date.now() - startTime
    
    // Determine system status
    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    const alerts: string[] = []
    
    if (outOfStockParts > 0) {
      alerts.push(`${outOfStockParts} parts are out of stock`)
      systemStatus = 'warning'
    }
    
    if (lowStockParts > 5) {
      alerts.push(`${lowStockParts} parts have low stock levels`)
      if (systemStatus !== 'critical') systemStatus = 'warning'
    }
    
    if (activeTasks > 10) {
      alerts.push(`${activeTasks} tasks are active`)
      systemStatus = 'warning'
    }
    
    if (pendingOrders > 20) {
      alerts.push(`${pendingOrders} orders are pending or in production`)
      if (systemStatus !== 'critical') systemStatus = 'warning'
    }

    // Format statistics
    const userStatistics = userStats.reduce((acc, stat) => {
      const key = `${stat.role.toLowerCase()}_${stat.isActive ? 'active' : 'inactive'}`
      acc[key] = stat._count
      return acc
    }, {} as Record<string, number>)

    const orderStatistics = orderStats.reduce((acc, stat) => {
      acc[stat.orderStatus.toLowerCase()] = stat._count
      return acc
    }, {} as Record<string, number>)

    const taskStatistics = taskStats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count
      return acc
    }, {} as Record<string, number>)

    return createStandardAPIResponse({
      systemStatus,
      alerts,
      timestamp: new Date().toISOString(),
      responseTime,
      statistics: {
        users: {
          ...userStatistics,
          total: userStats.reduce((sum, stat) => sum + stat._count, 0)
        },
        orders: {
          ...orderStatistics,
          pending: pendingOrders,
          total: orderStats.reduce((sum, stat) => sum + stat._count, 0)
        },
        parts: {
          total: partStats._count,
          lowStock: lowStockParts,
          outOfStock: outOfStockParts
        },
        assemblies: {
          total: assemblyStats._count
        },
        tasks: {
          ...taskStatistics,
          active: activeTasks,
          total: taskStats.reduce((sum, stat) => sum + stat._count, 0)
        }
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        timestamp: activity.createdAt,
        user: activity.user ? {
          name: activity.user.fullName,
          role: activity.user.role
        } : null,
        metadata: activity.metadata
      }))
    })

  } catch (error) {
    console.error('Error fetching system health:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to fetch system health')
  } finally {
    await prisma.$disconnect()
  }
}