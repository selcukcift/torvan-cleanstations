/**
 * Notification Trigger Service
 * Handles triggering both in-app and email notifications for various events
 */

import { PrismaClient } from '@prisma/client'
import { emailService, NotificationData } from './emailService'

const prisma = new PrismaClient()

class NotificationTriggerService {
  /**
   * Send notification to a user (both in-app and email based on preferences)
   */
  async sendNotification(
    userId: string,
    notificationType: string,
    data: NotificationData
  ): Promise<void> {
    try {
      // Generate notification content
      const { subject, content } = emailService.generateNotificationContent(notificationType, data)

      // Send in-app notification
      await this.sendInAppNotification(userId, notificationType, subject, content, data)

      // Send email notification (will check user preferences)
      await emailService.sendNotification(userId, notificationType, data, subject, content)

    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notificationType: string,
    data: NotificationData
  ): Promise<void> {
    const promises = userIds.map(userId => 
      this.sendNotification(userId, notificationType, data)
    )
    await Promise.all(promises)
  }

  /**
   * Send notification to users with specific roles
   */
  async sendNotificationToRoles(
    roles: string[],
    notificationType: string,
    data: NotificationData
  ): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: {
          role: { in: roles },
          isActive: true
        },
        select: { id: true }
      })

      const userIds = users.map(user => user.id)
      await this.sendNotificationToUsers(userIds, notificationType, data)
    } catch (error) {
      console.error('Error sending notifications to roles:', error)
    }
  }

  /**
   * Create in-app notification
   */
  private async sendInAppNotification(
    userId: string,
    notificationType: string,
    title: string,
    message: string,
    data: NotificationData
  ): Promise<void> {
    try {
      // Check if user has in-app notifications enabled for this type
      const preference = await prisma.notificationPreference.findUnique({
        where: {
          userId_notificationType: {
            userId,
            notificationType
          }
        }
      })

      // Default to enabled if no preference exists
      const inAppEnabled = preference?.inAppEnabled ?? true

      if (!inAppEnabled || !preference?.isActive) {
        console.log(`In-app notification skipped for user ${userId}, type ${notificationType}: disabled`)
        return
      }

      // Create system notification
      await prisma.systemNotification.create({
        data: {
          userId,
          type: notificationType,
          title,
          message,
          data,
          priority: this.getNotificationPriority(notificationType)
        }
      })

      console.log(`✅ In-app notification sent to user ${userId}: ${title}`)
    } catch (error) {
      console.error('Error creating in-app notification:', error)
    }
  }

  /**
   * Get notification priority based on type
   */
  private getNotificationPriority(notificationType: string): string {
    switch (notificationType) {
      case 'SYSTEM_ALERT':
      case 'DEADLINE_APPROACHING':
        return 'HIGH'
      case 'QC_APPROVAL_REQUIRED':
        return 'NORMAL'
      case 'ORDER_STATUS_CHANGE':
      case 'TASK_ASSIGNMENT':
      case 'ASSEMBLY_MILESTONE':
        return 'NORMAL'
      default:
        return 'NORMAL'
    }
  }

  // Specific notification triggers for common events

  /**
   * Trigger order status change notifications
   */
  async triggerOrderStatusChange(
    orderId: string,
    oldStatus: string,
    newStatus: string,
    changedBy?: string
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          createdBy: true
        }
      })

      if (!order) return

      const data: NotificationData = {
        orderId,
        oldStatus,
        newStatus,
        poNumber: order.poNumber,
        customerName: order.customerName,
        buildNumber: order.buildNumbers[0] // First build number for display
      }

      // Notify relevant roles based on the new status
      const rolesToNotify = this.getRolesForOrderStatus(newStatus)
      
      // Also notify the order creator and current assignee
      const usersToNotify = [order.createdById]
      if (order.currentAssignee && !usersToNotify.includes(order.currentAssignee)) {
        usersToNotify.push(order.currentAssignee)
      }

      // Send to specific users
      await this.sendNotificationToUsers(usersToNotify, 'ORDER_STATUS_CHANGE', data)
      
      // Send to relevant roles
      await this.sendNotificationToRoles(rolesToNotify, 'ORDER_STATUS_CHANGE', data)

    } catch (error) {
      console.error('Error triggering order status change notification:', error)
    }
  }

  /**
   * Trigger order assignment notifications
   */
  async triggerOrderAssignment(
    orderId: string,
    assigneeId: string,
    assignedBy?: string
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) return

      const data: NotificationData = {
        orderId,
        poNumber: order.poNumber,
        customerName: order.customerName,
        buildNumber: order.buildNumbers[0],
        assigneeId
      }

      // Notify the assignee
      await this.sendNotification(assigneeId, 'TASK_ASSIGNMENT', data)

      // Notify production coordinators
      await this.sendNotificationToRoles(['PRODUCTION_COORDINATOR'], 'TASK_ASSIGNMENT', data)

    } catch (error) {
      console.error('Error triggering order assignment notification:', error)
    }
  }

  /**
   * Trigger QC approval required notifications
   */
  async triggerQcApprovalRequired(
    orderId: string,
    qcType: 'PRE_QC' | 'FINAL_QC'
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) return

      const data: NotificationData = {
        orderId,
        poNumber: order.poNumber,
        customerName: order.customerName,
        buildNumber: order.buildNumbers[0],
        qcType
      }

      // Notify QC persons and production coordinators
      await this.sendNotificationToRoles(['QC_PERSON', 'PRODUCTION_COORDINATOR'], 'QC_APPROVAL_REQUIRED', data)

    } catch (error) {
      console.error('Error triggering QC approval notification:', error)
    }
  }

  /**
   * Trigger deadline approaching notifications
   */
  async triggerDeadlineApproaching(
    orderId: string,
    daysRemaining: number
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) return

      const data: NotificationData = {
        orderId,
        poNumber: order.poNumber,
        customerName: order.customerName,
        buildNumber: order.buildNumbers[0],
        wantDate: order.wantDate.toISOString().split('T')[0],
        daysRemaining
      }

      // Notify production coordinators and current assignee
      const usersToNotify = []
      if (order.currentAssignee) {
        usersToNotify.push(order.currentAssignee)
      }

      await this.sendNotificationToUsers(usersToNotify, 'DEADLINE_APPROACHING', data)
      await this.sendNotificationToRoles(['PRODUCTION_COORDINATOR'], 'DEADLINE_APPROACHING', data)

    } catch (error) {
      console.error('Error triggering deadline approaching notification:', error)
    }
  }

  /**
   * Trigger system alert notifications
   */
  async triggerSystemAlert(
    message: string,
    alertType: string = 'GENERAL',
    targetRoles?: string[]
  ): Promise<void> {
    try {
      const data: NotificationData = {
        message,
        alertType
      }

      const roles = targetRoles || ['ADMIN', 'PRODUCTION_COORDINATOR']
      await this.sendNotificationToRoles(roles, 'SYSTEM_ALERT', data)

    } catch (error) {
      console.error('Error triggering system alert notification:', error)
    }
  }

  /**
   * Get roles that should be notified for a specific order status
   */
  private getRolesForOrderStatus(status: string): string[] {
    switch (status) {
      case 'PARTS_SENT_WAITING_ARRIVAL':
        return ['PROCUREMENT_SPECIALIST']
      case 'READY_FOR_PRE_QC':
      case 'READY_FOR_FINAL_QC':
        return ['QC_PERSON']
      case 'READY_FOR_PRODUCTION':
      case 'TESTING_COMPLETE':
      case 'PACKAGING_COMPLETE':
        return ['ASSEMBLER']
      case 'READY_FOR_SHIP':
        return ['PRODUCTION_COORDINATOR']
      default:
        return ['PRODUCTION_COORDINATOR']
    }
  }
}

export const notificationTriggerService = new NotificationTriggerService()