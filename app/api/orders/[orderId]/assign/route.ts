import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { notificationTriggerService } from '@/lib/notificationTriggerService'

const prisma = new PrismaClient()

// Validation schema for assignment
const AssignmentSchema = z.object({
  assigneeId: z.string().nullable()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to assign orders
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { orderId } = params
    const body = await request.json()
    const { assigneeId } = AssignmentSchema.parse(body)

    // Verify the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        poNumber: true, 
        currentAssignee: true,
        orderStatus: true 
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // If assigneeId is provided, verify the assignee exists and has appropriate role
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { 
          id: true, 
          fullName: true, 
          role: true, 
          isActive: true 
        }
      })

      if (!assignee) {
        return NextResponse.json(
          { success: false, message: 'Assignee not found' },
          { status: 404 }
        )
      }

      if (!assignee.isActive) {
        return NextResponse.json(
          { success: false, message: 'Assignee is not active' },
          { status: 400 }
        )
      }

      // Check if assignee has appropriate role for the order status
      const appropriateRoles = getAppropriateRolesForStatus(order.orderStatus)
      if (!appropriateRoles.includes(assignee.role)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Cannot assign ${assignee.role} to order with status ${order.orderStatus}. Appropriate roles: ${appropriateRoles.join(', ')}` 
          },
          { status: 400 }
        )
      }
    }

    // Update the order assignment
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        currentAssignee: assigneeId,
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: { fullName: true, initials: true }
        }
      }
    })

    // Create history log entry
    await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: assigneeId ? 'ORDER_ASSIGNED' : 'ORDER_UNASSIGNED',
        newStatus: order.orderStatus,
        notes: assigneeId 
          ? `Order assigned to user ${assigneeId}` 
          : 'Order assignment removed'
      }
    })

    // Get assignee details for response
    let assigneeDetails = null
    if (assigneeId) {
      assigneeDetails = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: {
          id: true,
          fullName: true,
          initials: true,
          role: true
        }
      })
    }

    // Trigger notification for assignment
    if (assigneeId) {
      await notificationTriggerService.triggerOrderAssignment(orderId, assigneeId, user.id)
    }

    return NextResponse.json({
      success: true,
      message: assigneeId ? 'Order assigned successfully' : 'Order assignment removed',
      data: {
        orderId: orderId,
        assigneeId: assigneeId,
        assignee: assigneeDetails,
        updatedAt: updatedOrder.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating order assignment:', error)
    
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

// Helper function to determine appropriate roles for order status
function getAppropriateRolesForStatus(status: string): string[] {
  switch (status) {
    case 'ORDER_CREATED':
    case 'PARTS_SENT_WAITING_ARRIVAL':
      return ['PROCUREMENT_SPECIALIST']
    case 'READY_FOR_PRE_QC':
    case 'READY_FOR_FINAL_QC':
      return ['QC_PERSON']
    case 'READY_FOR_PRODUCTION':
    case 'TESTING_COMPLETE':
    case 'PACKAGING_COMPLETE':
      return ['ASSEMBLER']
    default:
      return ['ASSEMBLER', 'QC_PERSON', 'PROCUREMENT_SPECIALIST']
  }
}