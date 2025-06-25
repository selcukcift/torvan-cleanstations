import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { NotificationMatrix } from '@/lib/notificationMatrix'

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string; partId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has appropriate permissions
    if (!['PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions for outsourced parts management' 
      }, { status: 403 })
    }

    const { orderId, partId } = params
    const body = await request.json()
    const {
      status,
      supplier,
      expectedDelivery,
      trackingNumber,
      notes
    } = body

    // Validate required fields
    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Status is required'
      }, { status: 400 })
    }

    // Validate status value
    const validStatuses = ['PENDING_ORDER', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'DELAYED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status value'
      }, { status: 400 })
    }

    // Fetch the order and BOM item
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const bomItem = await prisma.bomItem.findUnique({
      where: { id: partId },
      include: {
        part: true,
        assembly: true
      }
    })

    if (!bomItem) {
      return NextResponse.json({ success: false, error: 'BOM item not found' }, { status: 404 })
    }

    // Start a transaction to update the outsourced part status
    await prisma.$transaction(async (tx) => {
      // Update the BOM item with outsourced part information
      const updatedBomItem = await tx.bomItem.update({
        where: { id: partId },
        data: {
          outsourcedStatus: status,
          outsourcedSupplier: supplier || null,
          outsourcedExpectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
          outsourcedTrackingNumber: trackingNumber || null,
          outsourcedNotes: notes || null,
          outsourcedUpdatedBy: user.id,
          outsourcedUpdatedAt: new Date()
        }
      })

      // Log the update in order history
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: 'OUTSOURCED_PART_UPDATED',
          oldStatus: order.orderStatus,
          newStatus: order.orderStatus, // Status stays the same
          notes: `Outsourced part ${bomItem.part?.partNumber || bomItem.assembly?.partNumber} status updated to ${status}. ${supplier ? `Supplier: ${supplier}. ` : ''}${notes ? `Notes: ${notes}` : ''}`
        }
      })

      return updatedBomItem
    })

    // Check if all outsourced parts are now received
    const allOutsourcedParts = await prisma.bomItem.findMany({
      where: {
        orderId,
        OR: [
          { part: { isOutsourced: true } },
          { assembly: { isOutsourced: true } }
        ]
      }
    })

    const pendingOutsourcedParts = allOutsourcedParts.filter(item => 
      !['RECEIVED', 'CANCELLED'].includes(item.outsourcedStatus || 'PENDING_ORDER')
    )

    // If all outsourced parts are received and order was on hold for parts, resume workflow
    if (pendingOutsourcedParts.length === 0 && order.orderStatus === 'ASSEMBLY_ON_HOLD_PARTS_ISSUE') {
      await prisma.$transaction(async (tx) => {
        // Update order status to resume production
        await tx.order.update({
          where: { id: orderId },
          data: { orderStatus: 'IN_PRODUCTION' }
        })

        // Log the status change
        await tx.orderHistoryLog.create({
          data: {
            orderId,
            userId: user.id,
            action: 'ORDER_STATUS_CHANGE',
            oldStatus: 'ASSEMBLY_ON_HOLD_PARTS_ISSUE',
            newStatus: 'IN_PRODUCTION',
            notes: 'All outsourced parts received. Assembly can resume.'
          }
        })
      })

      // Send notifications about workflow resumption
      await NotificationMatrix.notifyOrderStatusChange(
        orderId,
        order.poNumber,
        'ASSEMBLY_ON_HOLD_PARTS_ISSUE',
        'IN_PRODUCTION',
        user.id
      )
    }

    // Send specific notifications based on status change
    if (status === 'RECEIVED') {
      await NotificationMatrix.notifyAssemblyMilestone(
        orderId,
        order.poNumber,
        'OUTSOURCED_PART_RECEIVED',
        user.id
      )
    } else if (status === 'DELAYED') {
      await NotificationMatrix.notifyPartsShortage(
        orderId,
        order.poNumber,
        `Outsourced part delayed: ${bomItem.part?.partNumber || bomItem.assembly?.partNumber}. ${notes || 'No additional details provided.'}`,
        user.id
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        partId,
        partName: bomItem.part?.name || bomItem.assembly?.name,
        previousStatus: bomItem.outsourcedStatus || 'PENDING_ORDER',
        newStatus: status,
        supplier,
        expectedDelivery,
        trackingNumber,
        pendingOutsourcedParts: pendingOutsourcedParts.length,
        message: status === 'RECEIVED' 
          ? 'Part received successfully' 
          : `Outsourced part status updated to ${status}`
      }
    })

  } catch (error) {
    console.error('Error updating outsourced part:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update outsourced part status'
    }, { status: 500 })
  }
}