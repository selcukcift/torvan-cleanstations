import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { NotificationMatrix } from '@/lib/notificationMatrix'

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string; taskId: string } }
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
        error: 'Only Production Coordinators and Admins can assign tasks' 
      }, { status: 403 })
    }

    const { orderId, taskId } = params
    const body = await request.json()
    const { assigneeId, notes } = body

    // Validate required fields
    if (!assigneeId) {
      return NextResponse.json({
        success: false,
        error: 'Assignee ID is required'
      }, { status: 400 })
    }

    // Fetch the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        order: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    if (task.orderId !== orderId) {
      return NextResponse.json({ success: false, error: 'Task does not belong to this order' }, { status: 400 })
    }

    // Check if task can be assigned
    if (task.status !== 'PENDING') {
      return NextResponse.json({
        success: false,
        error: `Cannot assign task in ${task.status} status. Task must be PENDING.`
      }, { status: 400 })
    }

    // Verify the assignee exists and is an assembler
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
      return NextResponse.json({ success: false, error: 'Assignee not found' }, { status: 404 })
    }

    if (!assignee.isActive) {
      return NextResponse.json({ success: false, error: 'Assignee is not active' }, { status: 400 })
    }

    if (assignee.role !== 'ASSEMBLER') {
      return NextResponse.json({ success: false, error: 'Tasks can only be assigned to assemblers' }, { status: 400 })
    }

    // Start transaction to assign the task
    const result = await prisma.$transaction(async (tx) => {
      // Update the task with assignee
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          assigneeId,
          status: 'ASSIGNED',
          assignedAt: new Date()
        },
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          }
        }
      })

      // Log the assignment in order history
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: 'ASSEMBLY_TASK_ASSIGNED',
          oldStatus: task.order.orderStatus,
          newStatus: task.order.orderStatus, // Status stays the same
          notes: `Assembly task "${task.title}" assigned to ${assignee.fullName} by ${user.fullName}. ${notes ? `Notes: ${notes}` : ''}`
        }
      })

      return { updatedTask }
    })

    // Send notifications using the notification matrix
    await NotificationMatrix.processEvent({
      type: 'TASK_ASSIGNMENT',
      orderId,
      poNumber: task.order.poNumber,
      triggerData: {
        taskType: 'ASSEMBLY',
        taskTitle: task.title,
        assigneeName: assignee.fullName
      },
      triggeredBy: user.id
    })

    // Create direct notification to assignee
    await prisma.systemNotification.create({
      data: {
        userId: assigneeId,
        type: 'TASK_ASSIGNMENT',
        title: 'New Assembly Task Assigned',
        message: `You have been assigned assembly task "${task.title}" for order ${task.order.poNumber}. ${notes ? `Notes: ${notes}` : ''}`,
        priority: task.priority === 'URGENT' ? 'URGENT' : task.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
        data: {
          orderId,
          taskId,
          poNumber: task.order.poNumber,
          taskTitle: task.title,
          taskPriority: task.priority,
          estimatedHours: task.estimatedHours,
          dueDate: task.dueDate?.toISOString(),
          assignedBy: user.fullName
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        title: task.title,
        assigneeId,
        assigneeName: assignee.fullName,
        previousStatus: 'PENDING',
        newStatus: 'ASSIGNED',
        message: `Task assigned to ${assignee.fullName} successfully`
      }
    })

  } catch (error) {
    console.error('Error assigning task:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to assign task'
    }, { status: 500 })
  }
}