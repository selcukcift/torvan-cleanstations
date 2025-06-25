import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { NotificationMatrix } from '@/lib/notificationMatrix'

// GET: Fetch all tasks for an order
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = params

    const tasks = await prisma.task.findMany({
      where: { orderId },
      include: {
        assignee: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee?.fullName,
      estimatedHours: task.estimatedHours,
      dueDate: task.dueDate?.toISOString(),
      workInstructions: task.notes, // Using notes field for work instructions
      createdAt: task.createdAt.toISOString(),
      createdBy: task.creator?.fullName || 'Unknown'
    }))

    return NextResponse.json({
      success: true,
      data: formattedTasks
    })

  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tasks'
    }, { status: 500 })
  }
}

// POST: Create a new task
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
        error: 'Only Production Coordinators and Admins can create tasks' 
      }, { status: 403 })
    }

    const { orderId } = params
    const body = await request.json()
    const {
      title,
      description,
      priority = 'NORMAL',
      estimatedHours,
      dueDate,
      workInstructions
    } = body

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json({
        success: false,
        error: 'Title and description are required'
      }, { status: 400 })
    }

    // Validate priority
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid priority value'
      }, { status: 400 })
    }

    // Fetch the order to verify it exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        status: 'PENDING',
        orderId,
        createdById: user.id,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: workInstructions || null, // Store work instructions in notes field
        taskType: 'ASSEMBLY'
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    })

    // Log the task creation in order history
    await prisma.orderHistoryLog.create({
      data: {
        orderId,
        userId: user.id,
        action: 'ASSEMBLY_TASK_CREATED',
        oldStatus: order.orderStatus,
        newStatus: order.orderStatus, // Status stays the same
        notes: `Assembly task created: ${title}. Priority: ${priority}. ${estimatedHours ? `Estimated: ${estimatedHours}h. ` : ''}${description}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        estimatedHours: task.estimatedHours,
        dueDate: task.dueDate?.toISOString(),
        workInstructions: task.notes,
        createdAt: task.createdAt.toISOString(),
        createdBy: task.creator?.fullName || 'Unknown',
        message: 'Assembly task created successfully'
      }
    })

  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create task'
    }, { status: 500 })
  }
}