/**
 * Enhanced Notification System API
 * Comprehensive notification management with real-time capabilities
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
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
const notificationQuerySchema = z.object({
  type: z.enum(['ORDER_STATUS_CHANGE', 'TASK_ASSIGNMENT', 'QC_APPROVAL_REQUIRED', 'ASSEMBLY_MILESTONE', 'SERVICE_REQUEST', 'SYSTEM_ALERT', 'INVENTORY_LOW', 'DEADLINE_APPROACHING']).optional(),
  isRead: z.string().transform(val => val === 'true').optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  since: z.string().datetime().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(20)
})

const createNotificationSchema = z.object({
  userId: z.string().cuid().optional(), // If not provided, will be system-wide
  type: z.enum(['ORDER_STATUS_CHANGE', 'TASK_ASSIGNMENT', 'QC_APPROVAL_REQUIRED', 'ASSEMBLY_MILESTONE', 'SERVICE_REQUEST', 'SYSTEM_ALERT', 'INVENTORY_LOW', 'DEADLINE_APPROACHING']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  expiresAt: z.string().datetime().optional()
})

const markReadSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1).max(100),
  isRead: z.boolean().default(true)
})

/**
 * GET /api/v1/notifications
 * Get notifications for the current user
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
    
    const validation = notificationQuerySchema.safeParse(queryParams)
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

    const { type, isRead, priority, since, page, limit } = validation.data
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {
      OR: [
        { userId: user.id },
        { userId: null } // System-wide notifications
      ]
    }

    if (type) where.type = type
    if (isRead !== undefined) where.isRead = isRead
    if (priority) where.priority = priority
    if (since) where.createdAt = { gte: new Date(since) }

    // Only show non-expired notifications
    where.OR = [
      ...where.OR,
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]

    // Get notifications and count
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.systemNotification.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.systemNotification.count({ where }),
      prisma.systemNotification.count({
        where: {
          ...where,
          isRead: false
        }
      })
    ])

    // Get notification statistics
    const stats = await getNotificationStats(user.id)

    return createAPIResponse(
      createSuccessResponse({
        notifications,
        stats: {
          total: totalCount,
          unread: unreadCount,
          ...stats
        }
      }, { page, limit, total: totalCount }, requestId)
    )

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * POST /api/v1/notifications
 * Create a new notification (admin/system use)
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

    // Only admins and production coordinators can create notifications
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions to create notifications'
        }, requestId),
        403
      )
    }

    const body = await request.json()
    const validation = createNotificationSchema.safeParse(body)
    
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

    const { userId, type, title, message, data, priority, expiresAt } = validation.data

    // Validate target user if specified
    if (userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!targetUser) {
        return createAPIResponse(
          createErrorResponse({
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Target user not found'
          }, requestId),
          404
        )
      }
    }

    // Create notification
    const notification = await prisma.systemNotification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_NOTIFICATION',
        entityType: 'SystemNotification',
        entityId: notification.id,
        newValues: notification as any
      }
    })

    return createAPIResponse(
      createSuccessResponse(notification, undefined, requestId),
      201
    )

  } catch (error) {
    console.error('Error creating notification:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * PATCH /api/v1/notifications/mark-read
 * Mark notifications as read/unread
 */
export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    const body = await request.json()
    const validation = markReadSchema.safeParse(body)
    
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

    const { notificationIds, isRead } = validation.data

    // Verify all notifications belong to the user
    const notifications = await prisma.systemNotification.findMany({
      where: {
        id: { in: notificationIds },
        OR: [
          { userId: user.id },
          { userId: null } // System-wide notifications
        ]
      }
    })

    if (notifications.length !== notificationIds.length) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Some notifications do not belong to you or do not exist'
        }, requestId),
        403
      )
    }

    // Update notifications
    const updateResult = await prisma.systemNotification.updateMany({
      where: {
        id: { in: notificationIds },
        OR: [
          { userId: user.id },
          { userId: null }
        ]
      },
      data: {
        isRead,
        updatedAt: new Date()
      }
    })

    // Get updated stats
    const stats = await getNotificationStats(user.id)

    return createAPIResponse(
      createSuccessResponse({
        updatedCount: updateResult.count,
        isRead,
        stats
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error updating notification read status:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * DELETE /api/v1/notifications
 * Delete notifications (cleanup expired or bulk delete)
 */
export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    const url = new URL(request.url)
    const notificationIds = url.searchParams.get('ids')?.split(',') || []
    const deleteExpired = url.searchParams.get('expired') === 'true'
    const deleteRead = url.searchParams.get('read') === 'true'

    let deletedCount = 0

    if (deleteExpired) {
      // Delete expired notifications
      const result = await prisma.systemNotification.deleteMany({
        where: {
          OR: [
            { userId: user.id },
            { userId: null }
          ],
          expiresAt: {
            lt: new Date()
          }
        }
      })
      deletedCount += result.count
    }

    if (deleteRead) {
      // Delete read notifications older than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await prisma.systemNotification.deleteMany({
        where: {
          OR: [
            { userId: user.id },
            { userId: null }
          ],
          isRead: true,
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      })
      deletedCount += result.count
    }

    if (notificationIds.length > 0) {
      // Delete specific notifications
      const result = await prisma.systemNotification.deleteMany({
        where: {
          id: { in: notificationIds },
          OR: [
            { userId: user.id },
            { userId: null }
          ]
        }
      })
      deletedCount += result.count
    }

    return createAPIResponse(
      createSuccessResponse({
        deletedCount,
        operations: {
          deletedExpired: deleteExpired,
          deletedRead: deleteRead,
          deletedSpecific: notificationIds.length
        }
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error deleting notifications:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

// Helper functions

async function getNotificationStats(userId: string) {
  const [typeStats, priorityStats, recentActivity] = await Promise.all([
    // Stats by type
    prisma.systemNotification.groupBy({
      by: ['type'],
      where: {
        OR: [
          { userId },
          { userId: null }
        ],
        isRead: false
      },
      _count: {
        id: true
      }
    }),

    // Stats by priority
    prisma.systemNotification.groupBy({
      by: ['priority'],
      where: {
        OR: [
          { userId },
          { userId: null }
        ],
        isRead: false
      },
      _count: {
        id: true
      }
    }),

    // Recent activity (last 7 days)
    prisma.systemNotification.count({
      where: {
        OR: [
          { userId },
          { userId: null }
        ],
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ])

  return {
    byType: typeStats.reduce((acc, stat) => {
      acc[stat.type] = stat._count.id
      return acc
    }, {} as Record<string, number>),
    byPriority: priorityStats.reduce((acc, stat) => {
      acc[stat.priority] = stat._count.id
      return acc
    }, {} as Record<string, number>),
    recentActivity
  }
}