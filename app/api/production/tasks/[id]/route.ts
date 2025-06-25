import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const UpdateTaskSchema = z.object({
  completed: z.boolean().optional(),
  actualTime: z.number().min(0).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  // Testing task specific fields
  testResult: z.string().optional(), // 'PASS' or 'FAIL'
  measuredValue: z.number().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const task = await prisma.productionTask.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true,
            wantDate: true,
            buildNumbers: true
          }
        },
        completer: {
          select: {
            fullName: true,
            initials: true,
            role: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Production task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: task
    })

  } catch (error) {
    console.error('Error fetching production task:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = UpdateTaskSchema.parse(body)

    // Get existing task
    const existingTask = await prisma.productionTask.findUnique({
      where: { id: params.id },
      include: {
        order: true
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { success: false, message: 'Production task not found' },
        { status: 404 }
      )
    }

    // Check if order is in the right state for task updates
    if (!['READY_FOR_PRODUCTION', 'TESTING_COMPLETE'].includes(existingTask.order.orderStatus)) {
      return NextResponse.json(
        { success: false, message: 'Order must be in production phase to update tasks' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.completed !== undefined) {
      updateData.completed = validatedData.completed
      
      if (validatedData.completed) {
        updateData.completedAt = new Date()
        updateData.completedBy = user.id
        
        // If no start time was set, set it to now
        if (!existingTask.startedAt && !validatedData.startedAt) {
          updateData.startedAt = new Date()
        }
      } else {
        // If marking as incomplete, clear completion data
        updateData.completedAt = null
        updateData.completedBy = null
      }
    }
    
    if (validatedData.actualTime !== undefined) {
      updateData.actualTime = validatedData.actualTime
    }
    
    if (validatedData.photos !== undefined) {
      updateData.photos = validatedData.photos
    }
    
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    
    if (validatedData.startedAt) {
      updateData.startedAt = new Date(validatedData.startedAt)
    }
    
    if (validatedData.completedAt) {
      updateData.completedAt = new Date(validatedData.completedAt)
      updateData.completedBy = user.id
    }
    
    // Handle testing specific fields
    if (validatedData.testResult !== undefined) {
      updateData.testResult = validatedData.testResult
    }
    
    if (validatedData.measuredValue !== undefined) {
      updateData.measuredValue = validatedData.measuredValue
    }

    // Update task
    const updatedTask = await prisma.productionTask.update({
      where: { id: params.id },
      data: updateData,
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        },
        completer: {
          select: {
            fullName: true,
            initials: true
          }
        }
      }
    })

    // Check if all tasks for the order are completed and update order status accordingly
    if (validatedData.completed) {
      const allTasks = await prisma.productionTask.findMany({
        where: { orderId: existingTask.orderId }
      })

      // Separate production and testing tasks
      const productionTasks = allTasks.filter(t => t.category !== 'testing')
      const testingTasks = allTasks.filter(t => t.category === 'testing')
      
      // Check if current task completion affects overall progress
      const updatedTasks = allTasks.map(t => 
        t.id === params.id ? { ...t, completed: true } : t
      )
      
      const productionComplete = productionTasks.every(t => 
        t.id === params.id ? true : t.completed
      )
      
      const testingComplete = testingTasks.every(t => 
        t.id === params.id ? true : t.completed
      )

      let nextStatus = existingTask.order.orderStatus
      
      // Progress through stages based on task completion
      if (existingTask.order.orderStatus === 'READY_FOR_PRODUCTION' && productionComplete) {
        // All production tasks done - ready for testing (but don't auto-advance if no testing tasks)
        if (testingTasks.length > 0) {
          nextStatus = 'READY_FOR_PRODUCTION' // Stay in production phase until testing also done
        } else {
          nextStatus = 'TESTING_COMPLETE' // No testing tasks, skip to complete
        }
      } else if (existingTask.order.orderStatus === 'READY_FOR_PRODUCTION' && productionComplete && testingComplete) {
        nextStatus = 'TESTING_COMPLETE'
      }

      if (nextStatus !== existingTask.order.orderStatus) {
        await prisma.order.update({
          where: { id: existingTask.orderId },
          data: { orderStatus: nextStatus }
        })

        // Create history log
        const completionType = productionComplete && testingComplete ? 'assembly and testing' : 
                              productionComplete ? 'production' : 'testing'
        
        await prisma.orderHistoryLog.create({
          data: {
            orderId: existingTask.orderId,
            userId: user.id,
            action: 'PRODUCTION_MILESTONE',
            oldStatus: existingTask.order.orderStatus,
            newStatus: nextStatus,
            notes: `All ${completionType} tasks completed`
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: 'Production task updated successfully'
    })

  } catch (error) {
    console.error('Error updating production task:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins and production coordinators can delete tasks
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to delete production tasks' },
        { status: 403 }
      )
    }

    const task = await prisma.productionTask.findUnique({
      where: { id: params.id }
    })

    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Production task not found' },
        { status: 404 }
      )
    }

    // Cannot delete completed tasks
    if (task.completed) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete completed production tasks' },
        { status: 400 }
      )
    }

    await prisma.productionTask.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Production task deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting production task:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}