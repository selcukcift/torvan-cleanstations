import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/procurement/service-requests
 * 
 * Returns service orders that need procurement attention.
 * This integrates with the existing service order system.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view service requests' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')

    // Build where clause for service orders
    let where: any = {
      // Only show orders that might need procurement fulfillment
      orderStatus: {
        in: ['PENDING', 'APPROVED', 'IN_PROGRESS']
      }
    }

    if (status) {
      where.orderStatus = status
    }

    if (priority) {
      where.priority = priority
    }

    // Get service orders with items
    const serviceOrders = await prisma.serviceOrder.findMany({
      where,
      include: {
        requestedBy: {
          select: {
            fullName: true,
            initials: true
          }
        },
        approvedBy: {
          select: {
            fullName: true,
            initials: true
          }
        },
        items: {
          include: {
            assembly: {
              select: {
                name: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' }, // High priority first
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    // Transform data for procurement view
    const procurementRequests = serviceOrders.map(order => {
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
      const estimatedValue = order.items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0)

      return {
        id: order.id,
        requestNumber: order.orderNumber,
        department: order.department || 'Service Department',
        requestedBy: order.requestedBy?.fullName || 'Unknown',
        priority: order.priority || 'MEDIUM',
        status: order.orderStatus,
        createdAt: order.createdAt,
        approvedAt: order.approvedAt,
        itemsCount: totalItems,
        uniqueItemsCount: order.items.length,
        estimatedValue: estimatedValue,
        notes: order.notes,
        items: order.items.map(item => ({
          id: item.id,
          assemblyId: item.assemblyId,
          assemblyName: item.assembly?.name || 'Unknown Assembly',
          assemblyType: item.assembly?.type || 'ASSEMBLY',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * (item.unitPrice || 0),
          notes: item.notes
        }))
      }
    })

    // Get total count for pagination
    const totalCount = await prisma.serviceOrder.count({ where })

    // Get summary statistics
    const stats = await prisma.serviceOrder.groupBy({
      by: ['orderStatus'],
      where: {
        orderStatus: {
          in: ['PENDING', 'APPROVED', 'IN_PROGRESS']
        }
      },
      _count: {
        id: true
      }
    })

    const summary = {
      total: totalCount,
      pending: stats.find(s => s.orderStatus === 'PENDING')?._count.id || 0,
      approved: stats.find(s => s.orderStatus === 'APPROVED')?._count.id || 0,
      inProgress: stats.find(s => s.orderStatus === 'IN_PROGRESS')?._count.id || 0
    }

    return NextResponse.json({
      success: true,
      data: procurementRequests,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      summary
    })

  } catch (error) {
    console.error('Error fetching service requests for procurement:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch service requests' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/procurement/service-requests
 * 
 * Update procurement status for service requests
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to update service requests' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { serviceOrderId, action, notes } = body

    if (!serviceOrderId || !action) {
      return NextResponse.json(
        { success: false, message: 'Service order ID and action are required' },
        { status: 400 }
      )
    }

    let updateData: any = {
      updatedAt: new Date()
    }

    // Handle different procurement actions
    switch (action) {
      case 'start_fulfillment':
        updateData.orderStatus = 'IN_PROGRESS'
        updateData.procurementStartedAt = new Date()
        updateData.procurementStartedBy = user.id
        break
      case 'mark_fulfilled':
        updateData.orderStatus = 'FULFILLED'
        updateData.fulfilledAt = new Date()
        updateData.fulfilledBy = user.id
        break
      case 'request_approval':
        updateData.orderStatus = 'PENDING_APPROVAL'
        break
      case 'add_notes':
        // Just update notes
        break
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        )
    }

    if (notes) {
      updateData.procurementNotes = notes
    }

    // Update the service order
    const updatedOrder = await prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: updateData,
      include: {
        requestedBy: {
          select: {
            fullName: true,
            email: true
          }
        },
        items: {
          include: {
            assembly: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Log the procurement action
    await prisma.orderHistoryLog.create({
      data: {
        orderId: serviceOrderId,
        userId: user.id,
        action: `PROCUREMENT_${action.toUpperCase()}`,
        newStatus: updateData.orderStatus || 'UPDATED',
        notes: `Procurement action: ${action}${notes ? ` - ${notes}` : ''}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.orderStatus,
        action: action,
        updatedBy: user.fullName
      },
      message: `Service request ${action.replace('_', ' ')} successfully`
    })

  } catch (error) {
    console.error('Error updating service request:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update service request' },
      { status: 500 }
    )
  }
}