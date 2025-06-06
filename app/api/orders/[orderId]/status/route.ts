import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getAuthUser, canAccessOrder } from '@/lib/auth'
import notificationService from '@/src/services/notificationService'

const prisma = new PrismaClient()

// Validation schema for status update
const StatusUpdateSchema = z.object({
  newStatus: z.enum([
    'ORDER_CREATED',
    'PARTS_SENT_WAITING_ARRIVAL',
    'READY_FOR_PRE_QC',
    'READY_FOR_PRODUCTION',
    'TESTING_COMPLETE',
    'PACKAGING_COMPLETE',
    'READY_FOR_FINAL_QC',
    'READY_FOR_SHIP',
    'SHIPPED'
  ]),
  notes: z.string().optional()
})

// Status transition validation logic
function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  userRole: string
): { valid: boolean; message?: string } {
  // Admin can make any transition
  if (userRole === 'ADMIN') {
    return { valid: true }
  }

  // Production Coordinator can make most transitions
  if (userRole === 'PRODUCTION_COORDINATOR') {
    return { valid: true }
  }

  // Define allowed transitions based on current status and role
  const transitions: Record<string, Record<string, string[]>> = {
    'ORDER_CREATED': {
      'PROCUREMENT_SPECIALIST': ['PARTS_SENT_WAITING_ARRIVAL'],
      'PRODUCTION_COORDINATOR': ['PARTS_SENT_WAITING_ARRIVAL', 'READY_FOR_PRE_QC']
    },
    'PARTS_SENT_WAITING_ARRIVAL': {
      'PROCUREMENT_SPECIALIST': ['READY_FOR_PRE_QC'],
      'PRODUCTION_COORDINATOR': ['READY_FOR_PRE_QC', 'READY_FOR_PRODUCTION']
    },
    'READY_FOR_PRE_QC': {
      'QC_PERSON': ['READY_FOR_PRODUCTION'],
      'PRODUCTION_COORDINATOR': ['READY_FOR_PRODUCTION']
    },
    'READY_FOR_PRODUCTION': {
      'ASSEMBLER': ['TESTING_COMPLETE'],
      'PRODUCTION_COORDINATOR': ['TESTING_COMPLETE']
    },
    'TESTING_COMPLETE': {
      'ASSEMBLER': ['PACKAGING_COMPLETE'],
      'PRODUCTION_COORDINATOR': ['PACKAGING_COMPLETE', 'READY_FOR_FINAL_QC']
    },
    'PACKAGING_COMPLETE': {
      'QC_PERSON': ['READY_FOR_FINAL_QC'],
      'PRODUCTION_COORDINATOR': ['READY_FOR_FINAL_QC']
    },
    'READY_FOR_FINAL_QC': {
      'QC_PERSON': ['READY_FOR_SHIP'],
      'PRODUCTION_COORDINATOR': ['READY_FOR_SHIP']
    },
    'READY_FOR_SHIP': {
      'PRODUCTION_COORDINATOR': ['SHIPPED']
    }
  }

  const allowedTransitions = transitions[currentStatus]?.[userRole] || []
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      message: `${userRole} cannot transition from ${currentStatus} to ${newStatus}`
    }
  }

  return { valid: true }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    // Authenticate user
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { newStatus, notes } = StatusUpdateSchema.parse(body)

    // Fetch the current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            initials: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Check access control
    if (!canAccessOrder(user, order)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate status transition
    const transitionValidation = validateStatusTransition(
      order.orderStatus,
      newStatus,
      user.role
    )

    if (!transitionValidation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          message: transitionValidation.message || 'Invalid status transition' 
        },
        { status: 403 }
      )
    }

    // Perform the update within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: newStatus as any,
          updatedAt: new Date()
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              initials: true
            }
          }
        }
      })

      // Create history log entry
      await tx.orderHistoryLog.create({
        data: {
          orderId: orderId,
          userId: user.id,
          action: 'STATUS_UPDATED',
          oldStatus: order.orderStatus,
          newStatus: newStatus,
          notes: notes || `Status updated from ${order.orderStatus} to ${newStatus}`
        }
      })

      return updatedOrder
    })

    // Create notification for order creator (async, non-blocking)
    notificationService.createNotification({
      userId: order.createdById,
      message: `Order ${order.poNumber} status updated to ${newStatus}`,
      type: 'ORDER_STATUS_UPDATE',
      orderId: order.id
    }).catch(error => {
      console.error('Failed to create notification:', error)
    })

    // Also notify relevant users based on the new status
    const roleNotifications: Record<string, string[]> = {
      'READY_FOR_PRE_QC': ['QC_PERSON'],
      'READY_FOR_PRODUCTION': ['ASSEMBLER'],
      'READY_FOR_FINAL_QC': ['QC_PERSON'],
      'READY_FOR_SHIP': ['PRODUCTION_COORDINATOR']
    }

    const rolesToNotify = roleNotifications[newStatus]
    if (rolesToNotify) {
      // Find users with the relevant roles
      prisma.user.findMany({
        where: {
          role: { in: rolesToNotify },
          isActive: true
        },
        select: { id: true }
      }).then(users => {
        const userIds = users.map(u => u.id)
        if (userIds.length > 0) {
          notificationService.createBulkNotifications(userIds, {
            message: `Order ${order.poNumber} is now ${newStatus.replace(/_/g, ' ').toLowerCase()}`,
            type: 'ORDER_STATUS_UPDATE',
            orderId: order.id
          }).catch(error => {
            console.error('Failed to create bulk notifications:', error)
          })
        }
      }).catch(error => {
        console.error('Failed to find users for notifications:', error)
      })
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Order status updated to ${newStatus}`
    })

  } catch (error) {
    console.error('Error updating order status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.errors
        },
        { status: 400 }
      )
    }

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
