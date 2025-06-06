import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const TaskItemSchema = z.object({
  taskNumber: z.number().int().positive(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  workInstructionId: z.string().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  requiredToolIds: z.array(z.string()).optional(),
  requiredPartIds: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional()
})

const TaskListCreateSchema = z.object({
  name: z.string().min(1, 'Task list name is required'),
  description: z.string().optional(),
  assemblyType: z.string().min(1, 'Assembly type is required'),
  isActive: z.boolean().default(true),
  tasks: z.array(TaskItemSchema).optional().default([])
})

const TaskListUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  assemblyType: z.string().optional(),
  isActive: z.boolean().optional(),
  tasks: z.array(TaskItemSchema).optional()
})

// GET /api/v1/admin/task-lists - Get all task lists
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const taskLists = await prisma.taskList.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      taskLists
    })
  } catch (error) {
    console.error('Error fetching task lists:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/v1/admin/task-lists - Create new task list
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = TaskListCreateSchema.parse(body)

    const taskList = await prisma.taskList.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        assemblyType: validatedData.assemblyType,
        isActive: validatedData.isActive,
        tasks: {
          create: validatedData.tasks.map(task => ({
            taskNumber: task.taskNumber,
            title: task.title,
            description: task.description,
            workInstructionId: task.workInstructionId,
            estimatedDuration: task.estimatedDuration,
            requiredToolIds: task.requiredToolIds || [],
            requiredPartIds: task.requiredPartIds || [],
            dependencies: task.dependencies || []
          }))
        }
      },
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

    return NextResponse.json({
      success: true,
      taskList,
      message: 'Task list created successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error creating task list:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}