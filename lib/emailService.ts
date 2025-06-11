/**
 * Email Service
 * Handles sending email notifications based on user preferences
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface EmailNotification {
  to: string
  subject: string
  textContent: string
  htmlContent?: string
  notificationType: string
  userId: string
}

export interface NotificationData {
  orderId?: string
  taskId?: string
  assigneeId?: string
  oldStatus?: string
  newStatus?: string
  customerName?: string
  poNumber?: string
  buildNumber?: string
  qcType?: string
  milestone?: string
  wantDate?: string
  daysRemaining?: number
  [key: string]: any
}

class EmailService {
  /**
   * Send email notification respecting user preferences
   */
  async sendNotification(
    userId: string,
    notificationType: string,
    data: NotificationData,
    subject: string,
    content: string
  ): Promise<boolean> {
    try {
      // Get user's notification preference for this type
      const preference = await prisma.notificationPreference.findUnique({
        where: {
          userId_notificationType: {
            userId,
            notificationType
          }
        },
        include: {
          user: true
        }
      })

      // If no preference exists, use defaults (email disabled for most types)
      const emailEnabled = preference?.emailEnabled ?? this.getDefaultEmailSetting(notificationType, preference?.user?.role)
      
      if (!emailEnabled || !preference?.isActive) {
        console.log(`Email notification skipped for user ${userId}, type ${notificationType}: email disabled`)
        return false
      }

      // Check quiet hours
      if (this.isInQuietHours(preference.quietHoursStart, preference.quietHoursEnd)) {
        console.log(`Email notification deferred for user ${userId}, type ${notificationType}: quiet hours`)
        return false
      }

      // Get email address (custom or user's default)
      const emailAddress = preference.emailAddress || preference.user.email

      // Check frequency - for now we'll send immediately, but this could be enhanced
      // to batch notifications for hourly/daily/weekly frequencies
      if (preference.frequency !== 'IMMEDIATE') {
        console.log(`Email notification queued for later due to frequency setting: ${preference.frequency}`)
        // In a real implementation, you'd queue this for batch processing
        return false
      }

      // Send the email
      return await this.sendEmail({
        to: emailAddress,
        subject,
        textContent: content,
        htmlContent: this.generateHtmlContent(subject, content, data),
        notificationType,
        userId
      })

    } catch (error) {
      console.error('Error sending email notification:', error)
      return false
    }
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isInQuietHours(startHour?: number | null, endHour?: number | null): boolean {
    if (startHour === null || endHour === null || startHour === undefined || endHour === undefined) {
      return false
    }

    const now = new Date()
    const currentHour = now.getHours()

    // Handle quiet hours that cross midnight
    if (startHour > endHour) {
      return currentHour >= startHour || currentHour <= endHour
    } else {
      return currentHour >= startHour && currentHour <= endHour
    }
  }

  /**
   * Get default email setting for notification type and user role
   */
  private getDefaultEmailSetting(notificationType: string, userRole?: string): boolean {
    // Production Coordinators get email for critical events by default
    if (userRole === 'PRODUCTION_COORDINATOR') {
      return ['QC_APPROVAL_REQUIRED', 'DEADLINE_APPROACHING', 'SYSTEM_ALERT'].includes(notificationType)
    }
    
    // Other roles have email disabled by default
    return false
  }

  /**
   * Actually send the email (mock implementation for development)
   */
  private async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      // Development: Log email instead of sending
      console.log('📧 EMAIL NOTIFICATION (Development Mode)')
      console.log('====================================')
      console.log(`To: ${notification.to}`)
      console.log(`Subject: ${notification.subject}`)
      console.log(`Type: ${notification.notificationType}`)
      console.log(`User ID: ${notification.userId}`)
      console.log('Content:')
      console.log(notification.textContent)
      console.log('====================================')

      // In production, you would integrate with an email service here:
      // - SendGrid: await sgMail.send(mailOptions)
      // - AWS SES: await ses.sendEmail(params).promise()
      // - Nodemailer: await transporter.sendMail(mailOptions)
      // - etc.

      return true
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  /**
   * Generate HTML content for email
   */
  private generateHtmlContent(subject: string, textContent: string, data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
          .button { background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Torvan Medical CleanStation</h1>
            <h2>${subject}</h2>
          </div>
          <div class="content">
            <p>${textContent.replace(/\n/g, '<br>')}</p>
            ${data.orderId ? `<p><a href="${process.env.NEXTAUTH_URL}/orders/${data.orderId}" class="button">View Order</a></p>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from the Torvan Medical CleanStation production system.</p>
            <p>To manage your notification preferences, log in to the system and visit your dashboard settings.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate notification content templates
   */
  generateNotificationContent(notificationType: string, data: NotificationData): { subject: string, content: string } {
    switch (notificationType) {
      case 'ORDER_STATUS_CHANGE':
        return {
          subject: `Order Status Updated: ${data.poNumber}`,
          content: `Order ${data.poNumber} for ${data.customerName} has been updated from "${data.oldStatus}" to "${data.newStatus}".
          
${data.buildNumber ? `Build Number: ${data.buildNumber}` : ''}
          
Please review the order and take any necessary actions.`
        }

      case 'TASK_ASSIGNMENT':
        return {
          subject: `New Task Assigned: ${data.taskTitle || 'Production Task'}`,
          content: `You have been assigned a new task for order ${data.poNumber}.

Task: ${data.taskTitle || 'Production Task'}
Order: ${data.poNumber} - ${data.customerName}
${data.buildNumber ? `Build Number: ${data.buildNumber}` : ''}

Please check your dashboard to view the task details and begin work.`
        }

      case 'QC_APPROVAL_REQUIRED':
        return {
          subject: `QC Approval Required: ${data.poNumber}`,
          content: `Order ${data.poNumber} for ${data.customerName} is ready for ${data.qcType || 'Quality Control'} review.

${data.buildNumber ? `Build Number: ${data.buildNumber}` : ''}

Please review the order and complete the QC checklist.`
        }

      case 'ASSEMBLY_MILESTONE':
        return {
          subject: `Assembly Milestone Reached: ${data.milestone}`,
          content: `Assembly milestone "${data.milestone}" has been reached for order ${data.poNumber}.

Customer: ${data.customerName}
${data.buildNumber ? `Build Number: ${data.buildNumber}` : ''}

The order is progressing through the production workflow.`
        }

      case 'DEADLINE_APPROACHING':
        return {
          subject: `Deadline Approaching: ${data.poNumber} - ${data.daysRemaining} days remaining`,
          content: `Order ${data.poNumber} for ${data.customerName} want date is approaching.

Want Date: ${data.wantDate}
Days Remaining: ${data.daysRemaining}
${data.buildNumber ? `Build Number: ${data.buildNumber}` : ''}

Please review the order status and ensure timely completion.`
        }

      case 'SYSTEM_ALERT':
        return {
          subject: `System Alert: ${data.alertType || 'System Notification'}`,
          content: `${data.message || 'A system alert has been triggered.'}

${data.scheduledTime ? `Scheduled Time: ${data.scheduledTime}` : ''}

Please take appropriate action or contact system administration if needed.`
        }

      default:
        return {
          subject: `Notification: ${notificationType}`,
          content: `You have received a notification of type: ${notificationType}

${JSON.stringify(data, null, 2)}`
        }
    }
  }
}

export const emailService = new EmailService()