import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has appropriate permissions (Assembler, Production Coordinator, or Admin)
    if (!['ASSEMBLER', 'PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions for rework operations' 
      }, { status: 403 })
    }

    const { orderId } = params
    const body = await request.json()
    const { resolutionNotes, photosAttached, resolvedBy, resolvedAt } = body

    // Validate required fields
    if (!resolutionNotes?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Resolution notes are required'
      }, { status: 400 })
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Verify order is in a rework status
    const reworkStatuses = ['ASSEMBLY_REWORK_PRE_QC', 'ASSEMBLY_REWORK_FINAL_QC']
    if (!reworkStatuses.includes(order.orderStatus)) {
      return NextResponse.json({
        success: false,
        error: `Order is not in rework status. Current status: ${order.orderStatus}`
      }, { status: 400 })
    }

    // Determine the next status based on current rework status
    const nextStatus = order.orderStatus === 'ASSEMBLY_REWORK_PRE_QC' 
      ? 'READY_FOR_PRE_QC' 
      : 'READY_FOR_FINAL_QC'

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: nextStatus as any }
      })

      // Log the resolution in order history
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: 'REWORK_COMPLETED',
          oldStatus: order.orderStatus,
          newStatus: nextStatus,
          notes: `Assembly rework completed by ${resolvedBy || user.fullName}. Resolution: ${resolutionNotes}${photosAttached?.length ? ` (${photosAttached.length} photos attached)` : ''}`
        }
      })

      // Create notifications for QC personnel
      const qcPersonnel = await tx.user.findMany({
        where: { 
          role: 'QC_PERSON', 
          isActive: true 
        }
      })

      const notifications = []
      
      for (const qcPerson of qcPersonnel) {
        notifications.push({
          userId: qcPerson.id,
          type: 'QC_APPROVAL_REQUIRED' as any,
          title: `Rework Complete - Order ${order.poNumber}`,
          message: `Assembly rework has been completed for order ${order.poNumber}. Ready for ${nextStatus === 'READY_FOR_PRE_QC' ? 'Pre-QC' : 'Final QC'} re-inspection.`,
          data: {
            orderId,
            poNumber: order.poNumber,
            previousStatus: order.orderStatus,
            newStatus: nextStatus,
            resolvedBy: resolvedBy || user.fullName,
            resolutionNotes
          }
        })
      }

      // Also notify Production Coordinators
      const productionCoordinators = await tx.user.findMany({
        where: { 
          role: 'PRODUCTION_COORDINATOR', 
          isActive: true 
        }
      })

      for (const coordinator of productionCoordinators) {
        notifications.push({
          userId: coordinator.id,
          type: 'ORDER_STATUS_CHANGE' as any,
          title: `Rework Complete - Order ${order.poNumber}`,
          message: `Assembly rework completed for order ${order.poNumber}. Order moved to ${nextStatus} status.`,
          data: {
            orderId,
            poNumber: order.poNumber,
            previousStatus: order.orderStatus,
            newStatus: nextStatus,
            resolvedBy: resolvedBy || user.fullName
          }
        })
      }

      // Create all notifications
      if (notifications.length > 0) {
        await tx.systemNotification.createMany({
          data: notifications
        })
      }

      return { updatedOrder }
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        previousStatus: order.orderStatus,
        newStatus: nextStatus,
        message: `Rework completed successfully. Order moved to ${nextStatus} status.`
      }
    })

  } catch (error) {
    console.error('Error processing rework resolution:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process rework resolution'
    }, { status: 500 })
  }
}