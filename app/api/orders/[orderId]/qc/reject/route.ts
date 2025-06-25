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

    // Check if user has QC permissions
    if (user.role !== 'QC_PERSON' && user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions for QC operations' 
      }, { status: 403 })
    }

    const { orderId } = params
    const body = await request.json()
    const {
      qcType,
      rejectionReason,
      detailedNotes,
      correctiveActions,
      requiresRework,
      severity,
      digitalSignature
    } = body

    // Validate required fields
    if (!qcType || !rejectionReason || !detailedNotes) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: qcType, rejectionReason, detailedNotes'
      }, { status: 400 })
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Determine new order status based on QC type and whether rework is required
    let newStatus: string
    if (qcType === 'PRE_QC') {
      newStatus = requiresRework ? 'ASSEMBLY_REWORK_PRE_QC' : 'PRE_QC_REJECTED'
    } else {
      newStatus = requiresRework ? 'ASSEMBLY_REWORK_FINAL_QC' : 'FINAL_QC_REJECTED'
    }

    // Generate formatted digital signature
    const formattedSignature = digitalSignature || 
      `User: ${user.fullName} (${user.initials}) - ID: ${user.id} - Timestamp: ${new Date().toISOString()}`

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create QC result record with rejection
      const qcResult = await tx.orderQcResult.create({
        data: {
          orderId,
          qcFormTemplateId: 'rejection', // Special template ID for rejections
          qcPerformedById: user.id,
          overallStatus: 'FAILED',
          notes: `REJECTION: ${rejectionReason}\n\nDetails: ${detailedNotes}${correctiveActions ? `\n\nCorrective Actions: ${correctiveActions}` : ''}`,
          digitalSignature: formattedSignature
        }
      })

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: newStatus as any }
      })

      // Log the status change
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: 'QC_REJECTION',
          oldStatus: order.orderStatus,
          newStatus,
          notes: `QC ${qcType} rejected: ${rejectionReason}. Severity: ${severity}. ${requiresRework ? 'Requires assembly rework.' : 'No rework required.'}`
        }
      })

      // Create notifications for relevant personnel
      const notifications = []

      // Always notify Production Coordinator
      const productionCoordinators = await tx.user.findMany({
        where: { role: 'PRODUCTION_COORDINATOR', isActive: true }
      })

      for (const coordinator of productionCoordinators) {
        notifications.push({
          userId: coordinator.id,
          type: 'QC_APPROVAL_REQUIRED' as any,
          title: `QC Rejection - Order ${order.poNumber}`,
          message: `${qcType} has been rejected for order ${order.poNumber}. Reason: ${rejectionReason}. ${requiresRework ? 'Assembly rework required.' : 'Review and resubmit.'}`,
          data: {
            orderId,
            poNumber: order.poNumber,
            qcType,
            rejectionReason,
            severity,
            requiresRework
          }
        })
      }

      // If rework is required, notify Assemblers
      if (requiresRework) {
        const assemblers = await tx.user.findMany({
          where: { role: 'ASSEMBLER', isActive: true }
        })

        for (const assembler of assemblers) {
          notifications.push({
            userId: assembler.id,
            type: 'TASK_ASSIGNMENT' as any,
            title: `Rework Required - Order ${order.poNumber}`,
            message: `Order ${order.poNumber} requires assembly rework due to QC rejection. Issue: ${rejectionReason}. Please review QC notes for details.`,
            data: {
              orderId,
              poNumber: order.poNumber,
              qcType,
              rejectionReason,
              detailedNotes,
              correctiveActions
            }
          })
        }
      }

      // Create all notifications
      if (notifications.length > 0) {
        await tx.systemNotification.createMany({
          data: notifications
        })
      }

      return { qcResult, updatedOrder }
    })

    return NextResponse.json({
      success: true,
      data: {
        qcResultId: result.qcResult.id,
        newStatus,
        message: `QC ${qcType} rejected successfully. Order moved to ${newStatus} status.`
      }
    })

  } catch (error) {
    console.error('Error processing QC rejection:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process QC rejection'
    }, { status: 500 })
  }
}