/**
 * Assembly Task Management API Endpoints
 * Handles task creation, assignment, and workflow management
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createAPIResponse,
  getRequestId,
  handleAPIError,
  API_ERROR_CODES
} from '@/lib/apiResponse'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const createTaskSchema = z.object({
  orderId: z.string().cuid(),
  workInstructionId: z.string().cuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assignedToId: z.string().cuid().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  dependencies: z.array(z.string().cuid()).default([]),
  requiredTools: z.array(z.string().cuid()).default([])
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().cuid().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  actualMinutes: z.number().int().positive().optional()
})

const taskQuerySchema = z.object({
  orderId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional()
})

/**
 * GET /api/v1/assembly/tasks
 * Retrieve tasks with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    const validation = taskQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      const validationErrors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return createAPIResponse(
        createValidationErrorResponse(validationErrors, requestId),
        400
      )
    }

    const { orderId, assignedToId, status, priority, page = 1, limit = 10 } = validation.data
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (orderId) where.orderId = orderId
    if (assignedToId) where.assignedToId = assignedToId
    if (status) where.status = status
    if (priority) where.priority = priority

    // Role-based filtering
    if (user.role === 'ASSEMBLER') {
      where.assignedToId = user.id
    }

    // Get tasks with relations
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              poNumber: true,
              customerName: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              initials: true
            }
          },
          workInstruction: {
            select: {
              id: true,
              title: true,
              version: true
            }
          },
          dependencies: {
            include: {
              dependsOn: {
                select: {
                  id: true,
                  title: true,
                  status: true
                }
              }
            }
          },
          dependents: {
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                  status: true
                }
              }
            }
          },
          tools: {
            include: {
              tool: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              }
            }
          },
          notes: {
            include: {
              author: {
                select: {
                  id: true,
                  fullName: true,
                  initials: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.task.count({ where })
    ])

    return createAPIResponse(
      createSuccessResponse(
        tasks,
        { page, limit, total: totalCount },
        requestId
      )
    )

  } catch (error) {
    console.error('Error fetching tasks:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * POST /api/v1/assembly/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Check permissions
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'ASSEMBLER'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions to create tasks'
        }, requestId),
        403
      )
    }

    const body = await request.json()
    const validation = createTaskSchema.safeParse(body)
    
    if (!validation.success) {
      const validationErrors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return createAPIResponse(
        createValidationErrorResponse(validationErrors, requestId),
        400
      )
    }

    const {
      orderId,
      workInstructionId,
      title,
      description,
      priority,
      assignedToId,
      estimatedMinutes,
      dependencies,
      requiredTools
    } = validation.data

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return createAPIResponse(
        createNotFoundResponse('Order', orderId, requestId),
        404
      )
    }

    // Verify assigned user exists and has correct role
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId }
      })

      if (!assignedUser) {
        return createAPIResponse(
          createNotFoundResponse('User', assignedToId, requestId),
          404
        )
      }

      if (!['ASSEMBLER', 'PRODUCTION_COORDINATOR'].includes(assignedUser.role)) {
        return createAPIResponse(
          createErrorResponse({
            code: API_ERROR_CODES.BUSINESS_RULE_VIOLATION,
            message: 'Tasks can only be assigned to assemblers or production coordinators'
          }, requestId),
          422
        )
      }
    }

    // Verify work instruction exists
    if (workInstructionId) {
      const workInstruction = await prisma.workInstruction.findUnique({
        where: { id: workInstructionId }
      })

      if (!workInstruction) {
        return createAPIResponse(
          createNotFoundResponse('Work Instruction', workInstructionId, requestId),
          404
        )
      }
    }

    // Create task with dependencies and tools
    const task = await prisma.$transaction(async (tx) => {
      // Create the task
      const newTask = await tx.task.create({
        data: {
          orderId,
          workInstructionId,
          title,
          description,
          priority,
          assignedToId,
          estimatedMinutes
        }
      })

      // Create dependencies
      if (dependencies.length > 0) {
        await tx.taskDependency.createMany({
          data: dependencies.map(dependencyId => ({
            taskId: newTask.id,
            dependsOnId: dependencyId
          }))
        })
      }

      // Create tool requirements
      if (requiredTools.length > 0) {
        await tx.taskTool.createMany({
          data: requiredTools.map(toolId => ({
            taskId: newTask.id,
            toolId
          }))
        })
      }

      // Create notification for assigned user
      if (assignedToId) {
        await tx.systemNotification.create({
          data: {
            userId: assignedToId,
            type: 'TASK_ASSIGNMENT',
            title: 'New Task Assigned',
            message: `You have been assigned a new task: ${title}`,
            data: {
              taskId: newTask.id,
              orderId,
              priority
            },
            priority: priority === 'URGENT' ? 'HIGH' : 'NORMAL'
          }
        })
      }

      return newTask
    })

    // Fetch complete task with relations
    const completeTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        order: {
          select: {
            id: true,
            poNumber: true,
            customerName: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            initials: true
          }
        },
        workInstruction: {
          select: {
            id: true,
            title: true,
            version: true
          }
        },
        dependencies: {
          include: {
            dependsOn: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          }
        },
        tools: {
          include: {
            tool: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        }
      }
    })

    return createAPIResponse(
      createSuccessResponse(completeTask, undefined, requestId),
      201
    )

  } catch (error) {
    console.error('Error creating task:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * PUT /api/v1/assembly/tasks/bulk-update
 * Update multiple tasks (for batch operations)
 */
export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Check permissions
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions for bulk updates'
        }, requestId),
        403
      )
    }

    const body = await request.json()
    const bulkUpdateSchema = z.object({
      taskIds: z.array(z.string().cuid()).min(1),
      updates: updateTaskSchema
    })

    const validation = bulkUpdateSchema.safeParse(body)
    if (!validation.success) {
      const validationErrors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return createAPIResponse(
        createValidationErrorResponse(validationErrors, requestId),
        400
      )
    }

    const { taskIds, updates } = validation.data

    // Update tasks in transaction
    const updatedTasks = await prisma.$transaction(async (tx) => {
      const tasks = []
      
      for (const taskId of taskIds) {
        const updatedTask = await tx.task.update({
          where: { id: taskId },
          data: {
            ...updates,
            updatedAt: new Date()
          },
          include: {
            order: {
              select: {
                id: true,
                poNumber: true,
                customerName: true
              }
            },
            assignedTo: {
              select: {
                id: true,
                fullName: true,
                initials: true
              }
            }
          }
        })
        
        tasks.push(updatedTask)

        // Create notification for status changes
        if (updates.status && updates.assignedToId) {
          await tx.systemNotification.create({
            data: {
              userId: updates.assignedToId,
              type: 'TASK_ASSIGNMENT',
              title: 'Task Status Updated',
              message: `Task "${updatedTask.title}" status changed to ${updates.status}`,
              data: {
                taskId: updatedTask.id,
                orderId: updatedTask.orderId,
                newStatus: updates.status
              }
            }
          })
        }
      }
      
      return tasks
    })

    return createAPIResponse(
      createSuccessResponse({
        updatedCount: updatedTasks.length,
        tasks: updatedTasks
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error bulk updating tasks:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}