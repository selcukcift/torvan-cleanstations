import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const TaskItemSchema = z.object({
  id: z.string().optional(),
  taskNumber: z.number().int().positive(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  workInstructionId: z.string().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  requiredToolIds: z.array(z.string()).optional(),
  requiredPartIds: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional()
})

const TaskListUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  assemblyType: z.string().optional(),
  isActive: z.boolean().optional(),
  tasks: z.array(TaskItemSchema).optional()
})

// GET /api/v1/admin/task-lists/[taskListId] - Get single task list
export async function GET(
  request: NextRequest,
  { params }: { params: { taskListId: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const taskList = await prisma.taskList.findUnique({
      where: { id: params.taskListId },
      include: {
        tasks: {
          include: {
            workInstruction: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            taskNumber: 'asc'
          }
        }
      }
    })

    if (!taskList) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task list not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      taskList
    })
  } catch (error) {
    console.error('Error fetching task list:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// PUT /api/v1/admin/task-lists/[taskListId] - Update task list
export async function PUT(
  request: NextRequest,
  { params }: { params: { taskListId: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = TaskListUpdateSchema.parse(body)

    // Check if task list exists
    const existingTaskList = await prisma.taskList.findUnique({
      where: { id: params.taskListId }
    })

    if (!existingTaskList) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task list not found' 
      }, { status: 404 })
    }

    // Update task list and tasks in a transaction
    const taskList = await prisma.$transaction(async (tx) => {
      // Update the main task list
      const updatedTaskList = await tx.taskList.update({
        where: { id: params.taskListId },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          assemblyType: validatedData.assemblyType,
          isActive: validatedData.isActive
        }
      })

      // If tasks are provided, replace all tasks
      if (validatedData.tasks) {
        // Delete existing tasks
        await tx.task.deleteMany({
          where: { taskListId: params.taskListId }
        })

        // Create new tasks
        if (validatedData.tasks.length > 0) {
          await tx.task.createMany({
            data: validatedData.tasks.map(task => ({
              taskListId: params.taskListId,
              taskNumber: task.taskNumber,
              title: task.title,
              description: task.description,
              workInstructionId: task.workInstructionId,
              estimatedDuration: task.estimatedDuration,
              requiredToolIds: task.requiredToolIds || [],
              requiredPartIds: task.requiredPartIds || [],
              dependencies: task.dependencies || []
            }))
          })
        }
      }

      // Return updated task list with tasks
      return await tx.taskList.findUnique({
        where: { id: params.taskListId },
        include: {
          tasks: {
            include: {
              workInstruction: {
                select: {
                  id: true,
                  title: true
                }
              }
            },
            orderBy: {
              taskNumber: 'asc'
            }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      taskList,
      message: 'Task list updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error updating task list:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE /api/v1/admin/task-lists/[taskListId] - Delete task list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskListId: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Check if task list exists
    const existingTaskList = await prisma.taskList.findUnique({
      where: { id: params.taskListId }
    })

    if (!existingTaskList) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task list not found' 
      }, { status: 404 })
    }

    // Delete task list (tasks will be deleted due to cascade)
    await prisma.taskList.delete({
      where: { id: params.taskListId }
    })

    return NextResponse.json({
      success: true,
      message: 'Task list deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting task list:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}