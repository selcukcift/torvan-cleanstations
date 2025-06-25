import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { NotificationMatrix } from '@/lib/notificationMatrix'

// POST: Initiate Pre-QC
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has appropriate permissions
    if (!['PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only Production Coordinators and Admins can initiate Pre-QC' 
      }, { status: 403 })
    }

    const { orderId } = params
    const body = await request.json()
    const { notes } = body

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Check if order is in correct status for Pre-QC
    if (order.orderStatus !== 'READY_FOR_PRODUCTION') {
      return NextResponse.json({
        success: false,
        error: `Cannot initiate Pre-QC from ${order.orderStatus} status. Order must be READY_FOR_PRODUCTION.`
      }, { status: 400 })
    }

    // Start transaction to update order status
    const result = await prisma.$transaction(async (tx) => {
      // Update order status to READY_FOR_PRE_QC
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: 'READY_FOR_PRE_QC' }
      })

      // Log the status change
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: 'PRE_QC_INITIATED',
          oldStatus: order.orderStatus,
          newStatus: 'READY_FOR_PRE_QC',
          notes: notes || `Pre-QC initiated by ${user.fullName}`
        }
      })

      return { updatedOrder }
    })

    // Send notifications to QC personnel
    await NotificationMatrix.notifyOrderStatusChange(
      orderId,
      order.poNumber,
      order.orderStatus,
      'READY_FOR_PRE_QC',
      user.id
    )

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        previousStatus: order.orderStatus,
        newStatus: 'READY_FOR_PRE_QC',
        message: 'Pre-QC initiated successfully. QC personnel have been notified.'
      }
    })

  } catch (error) {
    console.error('Error initiating Pre-QC:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate Pre-QC'
    }, { status: 500 })
  }
}

// PUT: Complete or Fail Pre-QC
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has appropriate permissions
    if (!['QC_PERSON', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only QC Personnel and Admins can complete Pre-QC' 
      }, { status: 403 })
    }

    const { orderId } = params
    const body = await request.json()
    const { 
      result, // 'PASS' or 'FAIL'
      notes,
      rejectionReason,
      rejectionCategory,
      requiresRework,
      digitalSignature
    } = body

    // Validate required fields
    if (!result || !['PASS', 'FAIL'].includes(result)) {
      return NextResponse.json({
        success: false,
        error: 'Valid result (PASS or FAIL) is required'
      }, { status: 400 })
    }

    if (result === 'FAIL' && !rejectionReason) {
      return NextResponse.json({
        success: false,
        error: 'Rejection reason is required for failed Pre-QC'
      }, { status: 400 })
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Check if order is in correct status for Pre-QC completion
    if (order.orderStatus !== 'READY_FOR_PRE_QC') {
      return NextResponse.json({
        success: false,
        error: `Cannot complete Pre-QC from ${order.orderStatus} status. Order must be READY_FOR_PRE_QC.`
      }, { status: 400 })
    }

    // Determine new status based on result
    let newStatus: string
    if (result === 'PASS') {
      newStatus = 'READY_FOR_PRODUCTION'
    } else {
      newStatus = requiresRework ? 'ASSEMBLY_REJECTED_PRE_QC' : 'READY_FOR_PRODUCTION'
    }

    // Start transaction to update order and create QC result
    const updateResult = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: newStatus }
      })

      // Create QC result record
      const qcResult = await tx.orderQcResult.create({
        data: {
          orderId,
          userId: user.id,
          qcType: 'PRE_QC',
          result,
          notes: notes || '',
          rejectionReason: result === 'FAIL' ? rejectionReason : null,
          rejectionCategory: result === 'FAIL' ? rejectionCategory : null,
          requiresRework: result === 'FAIL' ? requiresRework : false,
          digitalSignature: digitalSignature || null
        }
      })

      // Log the status change
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: result === 'PASS' ? 'PRE_QC_PASSED' : 'PRE_QC_FAILED',
          oldStatus: order.orderStatus,
          newStatus,
          notes: result === 'PASS' 
            ? `Pre-QC passed by ${user.fullName}. ${notes || ''}`
            : `Pre-QC failed by ${user.fullName}. Reason: ${rejectionReason}. ${requiresRework ? 'Rework required.' : 'No rework required.'} ${notes || ''}`
        }
      })

      return { updatedOrder, qcResult }
    })

    // Send appropriate notifications
    if (result === 'PASS') {
      await NotificationMatrix.notifyOrderStatusChange(
        orderId,
        order.poNumber,
        order.orderStatus,
        newStatus,
        user.id
      )
    } else {
      await NotificationMatrix.notifyQCFailure(
        orderId,
        order.poNumber,
        'PRE_QC',
        rejectionReason,
        requiresRework,
        user.id
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        result,
        previousStatus: order.orderStatus,
        newStatus,
        qcResultId: updateResult.qcResult.id,
        requiresRework: result === 'FAIL' ? requiresRework : false,
        message: result === 'PASS' 
          ? 'Pre-QC completed successfully. Order ready for production.'
          : `Pre-QC failed. ${requiresRework ? 'Order sent for rework.' : 'Order ready for production with noted issues.'}`
      }
    })

  } catch (error) {
    console.error('Error completing Pre-QC:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to complete Pre-QC'
    }, { status: 500 })
  }
}