/**
 * Task Status Update API Endpoint
 * Specialized endpoint for updating task status with workflow validation
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
  createBusinessRuleViolationResponse,
  createAPIResponse,
  getRequestId,
  handleAPIError,
  API_ERROR_CODES
} from '@/lib/apiResponse'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const statusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']),
  notes: z.string().optional(),
  actualMinutes: z.number().int().positive().optional(),
  blockingReason: z.string().optional(),
  blockingTaskIds: z.array(z.string().cuid()).optional()
})

const batchStatusUpdateSchema = z.object({
  taskIds: z.array(z.string().cuid()).min(1).max(50),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']),
  notes: z.string().optional()
})

/**
 * PUT /api/v1/assembly/tasks/[taskId]/status
 * Update task status with comprehensive workflow validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    const { taskId } = params
    const body = await request.json()
    
    const validation = statusUpdateSchema.safeParse(body)
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

    const { status, notes, actualMinutes, blockingReason, blockingTaskIds } = validation.data

    // Get current task with full context
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        order: {
          select: {
            id: true,
            poNumber: true,
            customerName: true,
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
        dependencies: {
          include: {
            dependsOn: {
              select: {
                id: true,
                title: true,
                status: true,
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
                assignedTo: {
                  select: {
                    id: true,
                    fullName: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!currentTask) {
      return createAPIResponse(
        createNotFoundResponse('Task', taskId, requestId),
        404
      )
    }

    // Permission checks
    const canUpdateStatus = 
      user.role === 'ADMIN' ||
      user.role === 'PRODUCTION_COORDINATOR' ||
      (user.role === 'ASSEMBLER' && currentTask.assignedToId === user.id)

    if (!canUpdateStatus) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You can only update status of tasks assigned to you'
        }, requestId),
        403
      )
    }

    // Status transition validation
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'BLOCKED', 'CANCELLED'],
      'BLOCKED': ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
      'COMPLETED': ['IN_PROGRESS'], // Allow reopening if needed
      'CANCELLED': ['PENDING'] // Allow reactivation
    }

    const currentStatus = currentTask.status
    if (!validTransitions[currentStatus]?.includes(status)) {
      return createAPIResponse(
        createBusinessRuleViolationResponse(
          'INVALID_STATUS_TRANSITION',
          `Cannot transition from ${currentStatus} to ${status}`,
          requestId
        ),
        422
      )
    }

    // Business rule validations based on target status
    const validationResult = await validateStatusTransition(
      currentTask,
      status,
      { actualMinutes, blockingReason, blockingTaskIds }
    )

    if (!validationResult.isValid) {
      return createAPIResponse(
        createBusinessRuleViolationResponse(
          validationResult.rule || 'BUSINESS_RULE_VIOLATION',
          validationResult.message,
          requestId
        ),
        422
      )
    }

    // Perform status update in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status,
        updatedAt: new Date()
      }

      // Set timestamps based on status
      if (status === 'IN_PROGRESS' && currentStatus !== 'IN_PROGRESS') {
        updateData.startedAt = new Date()
      }
      
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
        if (actualMinutes) {
          updateData.actualMinutes = actualMinutes
        }
      }

      if (status === 'BLOCKED' && blockingReason) {
        updateData.blockingReason = blockingReason
      }

      // Update the task
      const updatedTask = await tx.task.update({
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
          }
        }
      })

      // Add status change note
      if (notes || status !== currentStatus) {
        const noteContent = notes 
          ? `Status changed to ${status}: ${notes}`
          : `Status changed to ${status}`

        await tx.taskNote.create({
          data: {
            taskId,
            authorId: user.id,
            content: noteContent
          }
        })
      }

      // Handle blocking relationships
      if (status === 'BLOCKED' && blockingTaskIds && blockingTaskIds.length > 0) {
        // Create blocking dependencies
        const blockingDependencies = blockingTaskIds.map(blockingTaskId => ({
          taskId: taskId,
          dependsOnId: blockingTaskId
        }))

        await tx.taskDependency.createMany({
          data: blockingDependencies,
          skipDuplicates: true
        })
      }

      // Create notifications
      await createStatusChangeNotifications(tx, updatedTask, currentStatus, status, user)

      // Check if order status should be updated
      await updateOrderStatusIfNeeded(tx, updatedTask.orderId)

      return updatedTask
    })

    return createAPIResponse(
      createSuccessResponse({
        ...result,
        statusChanged: {
          from: currentStatus,
          to: status,
          changedAt: new Date().toISOString(),
          changedBy: user.fullName
        }
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error updating task status:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * POST /api/v1/assembly/tasks/[taskId]/status/batch
 * Batch update status for multiple tasks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Only production coordinators and admins can do batch updates
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions for batch status updates'
        }, requestId),
        403
      )
    }

    const body = await request.json()
    const validation = batchStatusUpdateSchema.safeParse(body)
    
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

    const { taskIds, status, notes } = validation.data

    // Validate all tasks exist and can be updated
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: {
        order: {
          select: {
            id: true,
            poNumber: true
          }
        }
      }
    })

    if (tasks.length !== taskIds.length) {
      const foundIds = tasks.map(t => t.id)
      const missingIds = taskIds.filter(id => !foundIds.includes(id))
      
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Some tasks not found',
          details: { missingTaskIds: missingIds }
        }, requestId),
        404
      )
    }

    // Perform batch update
    const results = await prisma.$transaction(async (tx) => {
      const updatedTasks = []
      const errors = []

      for (const task of tasks) {
        try {
          // Validate status transition for each task
          const validationResult = await validateStatusTransition(task, status, {})
          
          if (!validationResult.isValid) {
            errors.push({
              taskId: task.id,
              error: validationResult.message
            })
            continue
          }

          const updatedTask = await tx.task.update({
            where: { id: task.id },
            data: {
              status,
              updatedAt: new Date(),
              ...(status === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS' && { startedAt: new Date() }),
              ...(status === 'COMPLETED' && { completedAt: new Date() })
            }
          })

          // Add note
          if (notes) {
            await tx.taskNote.create({
              data: {
                taskId: task.id,
                authorId: user.id,
                content: `Batch update: ${notes}`
              }
            })
          }

          updatedTasks.push(updatedTask)
        } catch (error) {
          errors.push({
            taskId: task.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return { updatedTasks, errors }
    })

    return createAPIResponse(
      createSuccessResponse({
        successCount: results.updatedTasks.length,
        errorCount: results.errors.length,
        updatedTasks: results.updatedTasks,
        errors: results.errors
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error batch updating task status:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

// Helper functions

async function validateStatusTransition(
  task: any,
  targetStatus: string,
  options: { actualMinutes?: number; blockingReason?: string; blockingTaskIds?: string[] }
): Promise<{ isValid: boolean; message: string; rule?: string }> {
  
  // Check dependencies for IN_PROGRESS status
  if (targetStatus === 'IN_PROGRESS') {
    const incompleteDependencies = task.dependencies?.filter(
      (dep: any) => dep.dependsOn.status !== 'COMPLETED'
    ) || []

    if (incompleteDependencies.length > 0) {
      return {
        isValid: false,
        message: 'Cannot start task while dependencies are incomplete',
        rule: 'DEPENDENCIES_INCOMPLETE'
      }
    }
  }

  // Check actual minutes for COMPLETED status
  if (targetStatus === 'COMPLETED') {
    if (!options.actualMinutes && !task.actualMinutes) {
      return {
        isValid: false,
        message: 'Actual minutes must be provided when completing a task',
        rule: 'ACTUAL_MINUTES_REQUIRED'
      }
    }
  }

  // Check blocking reason for BLOCKED status
  if (targetStatus === 'BLOCKED' && !options.blockingReason) {
    return {
      isValid: false,
      message: 'Blocking reason must be provided when blocking a task',
      rule: 'BLOCKING_REASON_REQUIRED'
    }
  }

  return { isValid: true, message: 'Valid transition' }
}

async function createStatusChangeNotifications(
  tx: any,
  task: any,
  oldStatus: string,
  newStatus: string,
  updatedBy: any
) {
  const notifications = []

  // Notify assigned user if different from updater
  if (task.assignedToId && task.assignedToId !== updatedBy.id) {
    notifications.push({
      userId: task.assignedToId,
      type: 'TASK_ASSIGNMENT',
      title: 'Task Status Updated',
      message: `Task "${task.title}" status changed from ${oldStatus} to ${newStatus}`,
      data: {
        taskId: task.id,
        orderId: task.orderId,
        oldStatus,
        newStatus,
        updatedBy: updatedBy.fullName
      }
    })
  }

  // Notify for milestone statuses
  if (newStatus === 'COMPLETED') {
    const coordinators = await tx.user.findMany({
      where: { role: 'PRODUCTION_COORDINATOR', isActive: true }
    })

    for (const coordinator of coordinators) {
      notifications.push({
        userId: coordinator.id,
        type: 'ASSEMBLY_MILESTONE',
        title: 'Task Completed',
        message: `Task "${task.title}" completed for order ${task.order.poNumber}`,
        data: {
          taskId: task.id,
          orderId: task.orderId,
          completedBy: updatedBy.fullName
        }
      })
    }
  }

  if (notifications.length > 0) {
    await tx.systemNotification.createMany({
      data: notifications
    })
  }
}

async function updateOrderStatusIfNeeded(tx: any, orderId: string) {
  // Get all tasks for the order
  const orderTasks = await tx.task.findMany({
    where: { orderId },
    select: { status: true }
  })

  if (orderTasks.length === 0) return

  const completedTasks = orderTasks.filter(t => t.status === 'COMPLETED').length
  const totalTasks = orderTasks.length

  // If all tasks are completed, update order status to TESTING_COMPLETE
  if (completedTasks === totalTasks) {
    await tx.order.update({
      where: { id: orderId },
      data: { orderStatus: 'TESTING_COMPLETE' }
    })
  }
  // If some tasks are in progress, update to READY_FOR_PRODUCTION
  else if (orderTasks.some(t => t.status === 'IN_PROGRESS')) {
    const currentOrder = await tx.order.findUnique({
      where: { id: orderId },
      select: { orderStatus: true }
    })

    if (currentOrder?.orderStatus === 'READY_FOR_PRE_QC') {
      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: 'READY_FOR_PRODUCTION' }
      })
    }
  }
}