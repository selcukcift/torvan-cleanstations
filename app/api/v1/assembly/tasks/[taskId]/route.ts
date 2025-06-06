/**
 * Individual Task Management API Endpoints
 * Handles single task operations: get, update, delete
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
const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().cuid().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  actualMinutes: z.number().int().positive().optional(),
  notes: z.string().optional()
})

const statusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']),
  notes: z.string().optional(),
  actualMinutes: z.number().int().positive().optional()
})

/**
 * GET /api/v1/assembly/tasks/[taskId]
 * Get a specific task with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = getRequestId(request)
  
  try {
    const resolvedParams = await params
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    const { taskId } = resolvedParams

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        order: {
          select: {
            id: true,
            poNumber: true,
            customerName: true,
            projectName: true,
            orderStatus: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            role: true
          }
        },
        workInstruction: {
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
              include: {
                requiredTools: {
                  include: {
                    tool: true
                  }
                }
              }
            }
          }
        },
        dependencies: {
          include: {
            dependsOn: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                assignedTo: {
                  select: {
                    fullName: true,
                    initials: true
                  }
                }
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
                status: true,
                priority: true,
                assignedTo: {
                  select: {
                    fullName: true,
                    initials: true
                  }
                }
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
                category: true,
                description: true
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
          }
        }
      }
    })

    if (!task) {
      return createAPIResponse(
        createNotFoundResponse('Task', taskId, requestId),
        404
      )
    }

    // Role-based access control
    if (user.role === 'ASSEMBLER' && task.assignedToId !== user.id) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You can only access tasks assigned to you'
        }, requestId),
        403
      )
    }

    // Add computed fields
    const enrichedTask = {
      ...task,
      canStart: task.dependencies.every(dep => dep.dependsOn.status === 'COMPLETED'),
      blockedBy: task.dependencies
        .filter(dep => dep.dependsOn.status !== 'COMPLETED')
        .map(dep => dep.dependsOn),
      blocking: task.dependents.map(dep => dep.task),
      timeTracking: {
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: task.actualMinutes,
        isOvertime: task.actualMinutes && task.estimatedMinutes 
          ? task.actualMinutes > task.estimatedMinutes 
          : false,
        efficiency: task.actualMinutes && task.estimatedMinutes
          ? Math.round((task.estimatedMinutes / task.actualMinutes) * 100)
          : null
      }
    }

    return createAPIResponse(
      createSuccessResponse(enrichedTask, undefined, requestId)
    )

  } catch (error) {
    console.error('Error fetching task:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * PATCH /api/v1/assembly/tasks/[taskId]
 * Update a specific task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = getRequestId(request)
  
  try {
    const resolvedParams = await params
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    const { taskId } = resolvedParams
    const body = await request.json()
    
    const validation = updateTaskSchema.safeParse(body)
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

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: true,
        order: true
      }
    })

    if (!existingTask) {
      return createAPIResponse(
        createNotFoundResponse('Task', taskId, requestId),
        404
      )
    }

    // Role-based permission checks
    const canUpdate = 
      user.role === 'ADMIN' ||
      user.role === 'PRODUCTION_COORDINATOR' ||
      (user.role === 'ASSEMBLER' && existingTask.assignedToId === user.id)

    if (!canUpdate) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions to update this task'
        }, requestId),
        403
      )
    }

    const updates = validation.data

    // Business rule validations
    if (updates.status === 'COMPLETED' && !updates.actualMinutes && !existingTask.actualMinutes) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.BUSINESS_RULE_VIOLATION,
          message: 'Actual minutes must be provided when completing a task'
        }, requestId),
        422
      )
    }

    // Check dependencies before allowing start
    if (updates.status === 'IN_PROGRESS') {
      const dependencies = await prisma.taskDependency.findMany({
        where: { taskId },
        include: {
          dependsOn: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      })

      const incompleteDependencies = dependencies.filter(
        dep => dep.dependsOn.status !== 'COMPLETED'
      )

      if (incompleteDependencies.length > 0) {
        return createAPIResponse(
          createErrorResponse({
            code: API_ERROR_CODES.BUSINESS_RULE_VIOLATION,
            message: 'Cannot start task while dependencies are incomplete',
            details: {
              blockedBy: incompleteDependencies.map(dep => ({
                id: dep.dependsOn.id,
                title: dep.dependsOn.title,
                status: dep.dependsOn.status
              }))
            }
          }, requestId),
          422
        )
      }
    }

    // Update task in transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {
        ...updates,
        updatedAt: new Date()
      }

      // Set timestamps based on status changes
      if (updates.status === 'IN_PROGRESS' && existingTask.status !== 'IN_PROGRESS') {
        updateData.startedAt = new Date()
      }
      
      if (updates.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
        updateData.completedAt = new Date()
      }

      // Update the task
      const task = await tx.task.update({
        where: { id: taskId },
        data: updateData,
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
          }
        }
      })

      // Add task note if provided
      if (updates.notes) {
        await tx.taskNote.create({
          data: {
            taskId,
            authorId: user.id,
            content: updates.notes
          }
        })
      }

      // Create notifications for status changes
      if (updates.status && updates.status !== existingTask.status) {
        const notifications = []

        // Notify assigned user if different from updater
        if (task.assignedToId && task.assignedToId !== user.id) {
          notifications.push({
            userId: task.assignedToId,
            type: 'TASK_ASSIGNMENT' as const,
            title: 'Task Status Updated',
            message: `Task "${task.title}" status changed to ${updates.status}`,
            data: {
              taskId: task.id,
              orderId: task.orderId,
              oldStatus: existingTask.status,
              newStatus: updates.status,
              updatedBy: user.fullName
            }
          })
        }

        // Notify production coordinator for completions
        if (updates.status === 'COMPLETED') {
          const coordinators = await tx.user.findMany({
            where: { role: 'PRODUCTION_COORDINATOR', isActive: true }
          })

          for (const coordinator of coordinators) {
            notifications.push({
              userId: coordinator.id,
              type: 'ASSEMBLY_MILESTONE' as const,
              title: 'Task Completed',
              message: `Task "${task.title}" has been completed for order ${task.order.poNumber}`,
              data: {
                taskId: task.id,
                orderId: task.orderId,
                completedBy: user.fullName,
                actualMinutes: task.actualMinutes
              }
            })
          }
        }

        // Create all notifications
        if (notifications.length > 0) {
          await tx.systemNotification.createMany({
            data: notifications
          })
        }
      }

      return task
    })

    return createAPIResponse(
      createSuccessResponse(updatedTask, undefined, requestId)
    )

  } catch (error) {
    console.error('Error updating task:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * DELETE /api/v1/assembly/tasks/[taskId]
 * Delete a specific task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const requestId = getRequestId(request)
  
  try {
    const resolvedParams = await params
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Only admins and production coordinators can delete tasks
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions to delete tasks'
        }, requestId),
        403
      )
    }

    const { taskId } = resolvedParams

    // Check if task exists and get dependencies
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
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
        }
      }
    })

    if (!task) {
      return createAPIResponse(
        createNotFoundResponse('Task', taskId, requestId),
        404
      )
    }

    // Check if task is blocking other tasks
    const activeDependents = task.dependents.filter(
      dep => !['COMPLETED', 'CANCELLED'].includes(dep.task.status)
    )

    if (activeDependents.length > 0) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.BUSINESS_RULE_VIOLATION,
          message: 'Cannot delete task that is blocking other active tasks',
          details: {
            blocking: activeDependents.map(dep => ({
              id: dep.task.id,
              title: dep.task.title,
              status: dep.task.status
            }))
          }
        }, requestId),
        422
      )
    }

    // Delete task and related data
    await prisma.$transaction(async (tx) => {
      // Delete related records (cascaded by foreign keys)
      await tx.task.delete({
        where: { id: taskId }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          entityType: 'Task',
          entityId: taskId,
          oldValues: task as any
        }
      })
    })

    return createAPIResponse(
      createSuccessResponse(
        { 
          id: taskId, 
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: user.fullName
        }, 
        undefined, 
        requestId
      )
    )

  } catch (error) {
    console.error('Error deleting task:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}