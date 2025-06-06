/**
 * Notification Service
 * Handles creation and management of user notifications
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NotificationService {
  /**
   * Create a new notification
   * @param {Object} data - Notification data
   * @param {string} data.userId - ID of the recipient user
   * @param {string} data.message - Notification message
   * @param {string} [data.type] - Type of notification (ORDER_CREATED, STATUS_CHANGED, etc.)
   * @param {string} [data.orderId] - Related order ID (optional)
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(data) {
    const { userId, message, type, orderId } = data;

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
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Get notifications for a specific user
   * @param {string} userId - ID of the user
   * @param {Object} options - Query options
   * @param {number} [options.limit=10] - Number of notifications to fetch
   * @param {boolean} [options.unreadOnly=false] - Whether to fetch only unread notifications
   * @returns {Promise<Array>} List of notifications
   */
  async getNotificationsForUser(userId, { limit = 10, unreadOnly = false } = {}) {
    try {
      const where = {
        recipientId: userId
      };

      if (unreadOnly) {
        where.isRead = false;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              poNumber: true,
              orderStatus: true
            }
          }
        }
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Mark a specific notification as read
   * @param {string} notificationId - ID of the notification
   * @param {string} userId - ID of the user (for authorization)
   * @returns {Promise<Object|null>} Updated notification or null if not found/authorized
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      // First check if the notification belongs to the user
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          recipientId: userId
        }
      });

      if (!notification) {
        return null;
      }

      // Update the notification
      const updatedNotification = await prisma.notification.update({
        where: {
          id: notificationId
        },
        data: {
          isRead: true
        },
        include: {
          order: true
        }
      });

      return updatedNotification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - ID of the user
   * @returns {Promise<number>} Count of updated notifications
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          recipientId: userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Create notifications for multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data (message, type, orderId)
   * @returns {Promise<Array>} Created notifications
   */
  async createBulkNotifications(userIds, notificationData) {
    try {
      const notifications = await prisma.notification.createMany({
        data: userIds.map(userId => ({
          recipientId: userId,
          message: notificationData.message,
          type: notificationData.type || null,
          linkToOrder: notificationData.orderId || null
        }))
      });

      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw new Error('Failed to create bulk notifications');
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - ID of the user
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount(userId) {
    try {
      const count = await prisma.notification.count({
        where: {
          recipientId: userId,
          isRead: false
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw new Error('Failed to get unread notification count');
    }
  }

  /**
   * Delete old read notifications (cleanup utility)
   * @param {number} daysOld - Delete notifications older than this many days
   * @returns {Promise<number>} Count of deleted notifications
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw new Error('Failed to cleanup old notifications');
    }
  }
}

module.exports = new NotificationService();