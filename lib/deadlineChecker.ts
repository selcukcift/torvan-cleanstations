/**
 * Deadline Checker Utility
 * Checks for orders with approaching deadlines and triggers notifications
 */

import { PrismaClient } from '@prisma/client'
import { notificationTriggerService } from './notificationTriggerService'

const prisma = new PrismaClient()

export class DeadlineChecker {
  /**
   * Check for orders with approaching deadlines and send notifications
   */
  async checkDeadlines(): Promise<void> {
    try {
      const today = new Date()
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(today.getDate() + 3)

      const oneDayFromNow = new Date()
      oneDayFromNow.setDate(today.getDate() + 1)

      // Find orders with want dates approaching (1-3 days)
      const approachingOrders = await prisma.order.findMany({
        where: {
          wantDate: {
            gte: today,
            lte: threeDaysFromNow
          },
          orderStatus: {
            not: 'SHIPPED'
          }
        },
        select: {
          id: true,
          poNumber: true,
          customerName: true,
          wantDate: true,
          buildNumbers: true,
          currentAssignee: true,
          orderStatus: true
        }
      })

      console.log(`🕐 Deadline checker: Found ${approachingOrders.length} orders with approaching deadlines`)

      for (const order of approachingOrders) {
        const daysRemaining = Math.ceil(
          (order.wantDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Only send notifications for 1 and 3 day warnings to avoid spam
        if (daysRemaining === 1 || daysRemaining === 3) {
          await notificationTriggerService.triggerDeadlineApproaching(order.id, daysRemaining)
          console.log(`📅 Sent deadline notification for order ${order.poNumber} (${daysRemaining} days remaining)`)
        }
      }

      // Find overdue orders
      const overdueOrders = await prisma.order.findMany({
        where: {
          wantDate: {
            lt: today
          },
          orderStatus: {
            not: 'SHIPPED'
          }
        },
        select: {
          id: true,
          poNumber: true,
          customerName: true,
          wantDate: true,
          buildNumbers: true,
          currentAssignee: true,
          orderStatus: true
        }
      })

      if (overdueOrders.length > 0) {
        console.log(`⚠️  Found ${overdueOrders.length} overdue orders`)
        
        // Send system alert for overdue orders
        const overdueList = overdueOrders.map(o => `${o.poNumber} (${o.customerName})`).join(', ')
        await notificationTriggerService.triggerSystemAlert(
          `${overdueOrders.length} orders are overdue: ${overdueList}`,
          'OVERDUE_ORDERS',
          ['ADMIN', 'PRODUCTION_COORDINATOR']
        )
      }

    } catch (error) {
      console.error('Error checking deadlines:', error)
    }
  }

  /**
   * Start periodic deadline checking (every hour)
   */
  startPeriodicCheck(): void {
    // Run immediately
    this.checkDeadlines()

    // Then run every hour
    setInterval(() => {
      this.checkDeadlines()
    }, 60 * 60 * 1000) // 1 hour

    console.log('📅 Deadline checker started - will run every hour')
  }
}

export const deadlineChecker = new DeadlineChecker()