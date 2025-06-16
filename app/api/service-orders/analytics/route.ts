import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, checkUserRole } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    // Check permissions - Allow all authenticated users to view analytics
    if (!checkUserRole(user, ['ADMIN', 'PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR', 'SERVICE_DEPARTMENT'])) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Get service order statistics
    const [
      totalOrders,
      pendingOrders,
      approvedOrders,
      rejectedOrders,
      recentOrders,
      topRequestedParts,
      averageApprovalTime,
      ordersByStatus,
      ordersByMonth
    ] = await Promise.all([
      // Total orders in period
      prisma.serviceOrder.count({
        where: {
          requestTimestamp: { gte: startDate }
        }
      }),

      // Pending orders
      prisma.serviceOrder.count({
        where: {
          status: 'PENDING_APPROVAL',
          requestTimestamp: { gte: startDate }
        }
      }),

      // Approved orders
      prisma.serviceOrder.count({
        where: {
          status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] },
          requestTimestamp: { gte: startDate }
        }
      }),

      // Rejected orders
      prisma.serviceOrder.count({
        where: {
          status: 'REJECTED',
          requestTimestamp: { gte: startDate }
        }
      }),

      // Recent orders with details
      prisma.serviceOrder.findMany({
        where: {
          requestTimestamp: { gte: startDate }
        },
        include: {
          requestedBy: {
            select: {
              fullName: true,
              initials: true
            }
          },
          items: {
            select: {
              quantityRequested: true,
              quantityApproved: true
            }
          }
        },
        orderBy: {
          requestTimestamp: 'desc'
        },
        take: 10
      }),

      // Top requested parts
      prisma.serviceOrderItem.groupBy({
        by: ['partId'],
        where: {
          serviceOrder: {
            requestTimestamp: { gte: startDate }
          }
        },
        _sum: {
          quantityRequested: true
        },
        _count: {
          partId: true
        },
        orderBy: {
          _sum: {
            quantityRequested: 'desc'
          }
        },
        take: 10
      }),

      // Average approval time calculation
      prisma.serviceOrder.findMany({
        where: {
          status: { in: ['APPROVED', 'REJECTED'] },
          requestTimestamp: { gte: startDate },
          updatedAt: { not: null }
        },
        select: {
          requestTimestamp: true,
          updatedAt: true
        }
      }),

      // Orders by status
      prisma.serviceOrder.groupBy({
        by: ['status'],
        where: {
          requestTimestamp: { gte: startDate }
        },
        _count: {
          status: true
        }
      }),

      // Orders by month
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "requestTimestamp") as month,
          COUNT(*) as count,
          status
        FROM "ServiceOrder" 
        WHERE "requestTimestamp" >= ${startDate}
        GROUP BY DATE_TRUNC('month', "requestTimestamp"), status
        ORDER BY month DESC
      `
    ])

    // Calculate average approval time
    let avgApprovalTimeHours = 0
    if (averageApprovalTime.length > 0) {
      const totalHours = averageApprovalTime.reduce((sum, order) => {
        const diffMs = order.updatedAt.getTime() - order.requestTimestamp.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        return sum + diffHours
      }, 0)
      avgApprovalTimeHours = Math.round((totalHours / averageApprovalTime.length) * 10) / 10
    }

    // Get part details for top requested parts
    const topPartsWithDetails = await Promise.all(
      topRequestedParts.map(async (item) => {
        const part = await prisma.part.findUnique({
          where: { partId: item.partId },
          select: {
            partId: true,
            name: true,
            photoURL: true,
            manufacturerPartNumber: true
          }
        })
        return {
          ...part,
          totalRequested: item._sum.quantityRequested,
          timesRequested: item._count.partId
        }
      })
    )

    // Calculate fulfillment rate
    const fulfilledOrders = approvedOrders
    const fulfillmentRate = totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 100) : 0

    // User-specific filtering
    let userSpecificStats = {}
    if (user.role === 'SERVICE_DEPARTMENT') {
      // Additional stats for service department users
      const userOrders = await prisma.serviceOrder.count({
        where: {
          requestedById: user.id,
          requestTimestamp: { gte: startDate }
        }
      })
      
      const userApprovedOrders = await prisma.serviceOrder.count({
        where: {
          requestedById: user.id,
          status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] },
          requestTimestamp: { gte: startDate }
        }
      })

      userSpecificStats = {
        myOrders: userOrders,
        myApprovedOrders: userApprovedOrders,
        myApprovalRate: userOrders > 0 ? Math.round((userApprovedOrders / userOrders) * 100) : 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          pendingOrders,
          approvedOrders,
          rejectedOrders,
          fulfillmentRate,
          averageApprovalTimeHours: avgApprovalTimeHours,
          period: parseInt(period)
        },
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        ordersByMonth: ordersByMonth,
        topRequestedParts: topPartsWithDetails.filter(part => part !== null),
        recentActivity: recentOrders.map(order => ({
          id: order.id,
          requestedBy: order.requestedBy.fullName,
          itemCount: order.items.length,
          totalQuantity: order.items.reduce((sum, item) => sum + item.quantityRequested, 0),
          status: order.status,
          requestTimestamp: order.requestTimestamp
        })),
        userSpecific: userSpecificStats
      }
    })

  } catch (error) {
    console.error('Error fetching service order analytics:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}