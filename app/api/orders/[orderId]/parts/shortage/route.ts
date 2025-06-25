import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { NotificationMatrix } from '@/lib/notificationMatrix'

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
        error: 'Insufficient permissions for parts shortage reporting' 
      }, { status: 403 })
    }

    const { orderId } = params
    const body = await request.json()
    const {
      partId,
      partName,
      bomItemId,
      issueCategory,
      issueDescription,
      quantityNeeded,
      quantityAvailable,
      expectedResolution,
      severity
    } = body

    // Validate required fields
    if (!partId || !issueCategory || !issueDescription) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: partId, issueCategory, issueDescription'
      }, { status: 400 })
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Check if order is in a state where parts issues can be reported
    const allowedStatuses = ['READY_FOR_PRODUCTION', 'IN_PRODUCTION']
    if (!allowedStatuses.includes(order.orderStatus)) {
      return NextResponse.json({
        success: false,
        error: `Cannot report parts shortage for order in ${order.orderStatus} status`
      }, { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update order status to ASSEMBLY_ON_HOLD_PARTS_ISSUE
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: 'ASSEMBLY_ON_HOLD_PARTS_ISSUE' }
      })

      // Log the issue in order history
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: 'PARTS_SHORTAGE_REPORTED',
          oldStatus: order.orderStatus,
          newStatus: 'ASSEMBLY_ON_HOLD_PARTS_ISSUE',
          notes: `Parts shortage reported by ${user.fullName}. Part: ${partName} (${partId}). Issue: ${issueCategory}. ${issueDescription}`
        }
      })

      return { updatedOrder }
    })

    // Create detailed part shortage description for notifications
    const partDetails = `${partName} (${partId}) - ${issueCategory}. ${quantityNeeded ? `Needed: ${quantityNeeded}` : ''}${quantityAvailable ? `, Available: ${quantityAvailable}` : ''}. ${issueDescription}`

    // Send notifications using the notification matrix
    await NotificationMatrix.notifyPartsShortage(
      orderId,
      order.poNumber,
      partDetails,
      user.id
    )

    // Also create urgent notifications for immediate action
    const urgentNotifications = []

    // Notify all procurement specialists
    const procurementSpecialists = await prisma.user.findMany({
      where: { role: 'PROCUREMENT_SPECIALIST', isActive: true }
    })

    // Notify all production coordinators
    const productionCoordinators = await prisma.user.findMany({
      where: { role: 'PRODUCTION_COORDINATOR', isActive: true }
    })

    const allRecipients = [...procurementSpecialists, ...productionCoordinators]

    for (const recipient of allRecipients) {
      urgentNotifications.push({
        userId: recipient.id,
        type: 'PARTS_SHORTAGE' as any,
        title: `URGENT: Parts Shortage - Order ${order.poNumber}`,
        message: `Parts shortage reported for order ${order.poNumber}. Part: ${partName} (${partId}). Issue: ${issueCategory}. Severity: ${severity}. ${expectedResolution ? `Expected resolution: ${expectedResolution}` : 'No resolution timeline provided.'}`,
        priority: severity === 'critical' ? 'URGENT' : 'HIGH',
        data: {
          orderId,
          poNumber: order.poNumber,
          partId,
          partName,
          issueCategory,
          severity,
          quantityNeeded,
          quantityAvailable,
          reportedBy: user.fullName
        }
      })
    }

    // Create urgent notifications
    if (urgentNotifications.length > 0) {
      await prisma.systemNotification.createMany({
        data: urgentNotifications
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        previousStatus: order.orderStatus,
        newStatus: 'ASSEMBLY_ON_HOLD_PARTS_ISSUE',
        partId,
        issueCategory,
        severity,
        notificationsSent: urgentNotifications.length,
        message: 'Parts shortage reported successfully. Order placed on hold and relevant personnel notified.'
      }
    })

  } catch (error) {
    console.error('Error reporting parts shortage:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to report parts shortage'
    }, { status: 500 })
  }
}