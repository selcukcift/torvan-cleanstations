/**
 * Native TypeScript Notification Service
 * Handles creation and management of user notifications
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NotificationData {
  userId: string
  message: string
  type?: string
  orderId?: string
}

interface NotificationOptions {
  limit?: number
  unreadOnly?: boolean
}

interface Notification {
  id: string
  message: string
  type?: string
  isRead: boolean
  createdAt: Date
  linkToOrder?: string
  order?: {
    id: string
    poNumber: string
  }
  recipient: {
    id: string
    fullName: string
    email: string
  }
}

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: NotificationData): Promise<Notification> {
    const { userId, message, type, orderId } = data

    try {
      const notification = await prisma.notification.create({
        data: {
          recipientId: userId,
          message,
          type: type || null,
          linkToOrder: orderId || null
        },
        include: {
          order: true,
          recipient: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      })

      return {
        id: notification.id,
        message: notification.message,
        type: notification.type || undefined,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        linkToOrder: notification.linkToOrder || undefined,
        order: notification.order ? {
          id: notification.order.id,
          poNumber: notification.order.poNumber
        } : undefined,
        recipient: notification.recipient
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      throw new Error('Failed to create notification')
    }
  }

  /**
   * Get notifications for a specific user
   */
  async getNotificationsForUser(userId: string, options: NotificationOptions = {}): Promise<Notification[]> {
    const { limit = 10, unreadOnly = false } = options

    try {
      const whereClause: any = {
        recipientId: userId
      }

      if (unreadOnly) {
        whereClause.isRead = false
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              poNumber: true
            }
          },
          recipient: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return notifications.map(notification => ({
        id: notification.id,
        message: notification.message,
        type: notification.type || undefined,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        linkToOrder: notification.linkToOrder || undefined,
        order: notification.order ? {
          id: notification.order.id,
          poNumber: notification.order.poNumber
        } : undefined,
        recipient: notification.recipient
      }))
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw new Error('Failed to fetch notifications')
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          recipientId: userId // Ensure user can only mark their own notifications
        },
        data: {
          isRead: true
        }
      })

      return result.count > 0
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw new Error('Failed to mark notification as read')
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          recipientId: userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      })

      return result.count
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw new Error('Failed to mark all notifications as read')
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          recipientId: userId,
          isRead: false
        }
      })

      return count
    } catch (error) {
      console.error('Error getting unread count:', error)
      throw new Error('Failed to get unread count')
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          recipientId: userId // Ensure user can only delete their own notifications
        }
      })

      return result.count > 0
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw new Error('Failed to delete notification')
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(notifications: NotificationData[]): Promise<number> {
    try {
      const result = await prisma.notification.createMany({
        data: notifications.map(notification => ({
          recipientId: notification.userId,
          message: notification.message,
          type: notification.type || null,
          linkToOrder: notification.orderId || null
        }))
      })

      return result.count
    } catch (error) {
      console.error('Error creating bulk notifications:', error)
      throw new Error('Failed to create bulk notifications')
    }
  }

  /**
   * Notify users by role
   */
  async notifyUsersByRole(role: string, message: string, type?: string, orderId?: string): Promise<number> {
    try {
      // Get all users with the specified role
      const users = await prisma.user.findMany({
        where: {
          role: role as any,
          isActive: true
        },
        select: {
          id: true
        }
      })

      if (users.length === 0) {
        return 0
      }

      // Create notifications for all users
      const notifications = users.map(user => ({
        userId: user.id,
        message,
        type,
        orderId
      }))

      return await this.createBulkNotifications(notifications)
    } catch (error) {
      console.error('Error notifying users by role:', error)
      throw new Error('Failed to notify users by role')
    }
  }
}

const notificationService = new NotificationService()
export default notificationService