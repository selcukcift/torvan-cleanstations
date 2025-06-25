import { prisma } from './prisma'

export interface NotificationEvent {
  type: 'ORDER_STATUS_CHANGE' | 'QC_FAILURE' | 'TASK_ASSIGNMENT' | 'PARTS_SHORTAGE' | 'ASSEMBLY_MILESTONE'
  orderId: string
  poNumber: string
  triggerData: any
  triggeredBy: string
}

export interface NotificationRule {
  eventType: string
  recipientRoles: string[]
  condition?: (data: any) => boolean
  messageTemplate: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

/**
 * Comprehensive notification matrix for workflow events
 */
const NOTIFICATION_MATRIX: NotificationRule[] = [
  // Order Status Changes
  {
    eventType: 'ORDER_STATUS_CHANGE',
    recipientRoles: ['QC_PERSON'],
    condition: (data) => data.newStatus === 'READY_FOR_PRE_QC',
    messageTemplate: 'Order {{poNumber}} is ready for Pre-QC inspection',
    priority: 'NORMAL'
  },
  {
    eventType: 'ORDER_STATUS_CHANGE',
    recipientRoles: ['QC_PERSON'],
    condition: (data) => data.newStatus === 'READY_FOR_FINAL_QC',
    messageTemplate: 'Order {{poNumber}} is ready for Final QC inspection',
    priority: 'NORMAL'
  },
  {
    eventType: 'ORDER_STATUS_CHANGE',
    recipientRoles: ['ASSEMBLER'],
    condition: (data) => data.newStatus === 'READY_FOR_PRODUCTION',
    messageTemplate: 'Order {{poNumber}} is ready for production assembly',
    priority: 'NORMAL'
  },

  // QC Failures and Rework
  {
    eventType: 'QC_FAILURE',
    recipientRoles: ['PRODUCTION_COORDINATOR'],
    condition: (data) => data.qcType === 'PRE_QC',
    messageTemplate: 'Order {{poNumber}} failed Pre-QC: {{rejectionReason}}. {{requiresRework}}',
    priority: 'HIGH'
  },
  {
    eventType: 'QC_FAILURE',
    recipientRoles: ['PRODUCTION_COORDINATOR'],
    condition: (data) => data.qcType === 'FINAL_QC',
    messageTemplate: 'Order {{poNumber}} failed Final QC: {{rejectionReason}}. {{requiresRework}}',
    priority: 'URGENT'
  },
  {
    eventType: 'QC_FAILURE',
    recipientRoles: ['ASSEMBLER'],
    condition: (data) => data.requiresRework,
    messageTemplate: 'Rework required for order {{poNumber}}: {{rejectionReason}}. Check QC notes for details.',
    priority: 'HIGH'
  },

  // Parts Shortages
  {
    eventType: 'PARTS_SHORTAGE',
    recipientRoles: ['PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR'],
    messageTemplate: 'Parts shortage reported for order {{poNumber}}: {{partDetails}}',
    priority: 'URGENT'
  },

  // Task Assignments
  {
    eventType: 'TASK_ASSIGNMENT',
    recipientRoles: ['ASSEMBLER'],
    condition: (data) => data.taskType === 'ASSEMBLY',
    messageTemplate: 'New assembly task assigned for order {{poNumber}}: {{taskTitle}}',
    priority: 'NORMAL'
  },
  {
    eventType: 'TASK_ASSIGNMENT',
    recipientRoles: ['QC_PERSON'],
    condition: (data) => data.taskType === 'QC',
    messageTemplate: 'QC task assigned for order {{poNumber}}: {{taskTitle}}',
    priority: 'NORMAL'
  },

  // Assembly Milestones
  {
    eventType: 'ASSEMBLY_MILESTONE',
    recipientRoles: ['PRODUCTION_COORDINATOR'],
    condition: (data) => data.milestone === 'ALL_CRITICAL_PARTS_TRACKED',
    messageTemplate: 'All critical components tracked for order {{poNumber}}. Ready for next phase.',
    priority: 'NORMAL'
  },
  {
    eventType: 'ASSEMBLY_MILESTONE',
    recipientRoles: ['QC_PERSON'],
    condition: (data) => data.milestone === 'REWORK_COMPLETED',
    messageTemplate: 'Assembly rework completed for order {{poNumber}}. Ready for re-inspection.',
    priority: 'NORMAL'
  },
  {
    eventType: 'ASSEMBLY_MILESTONE',
    recipientRoles: ['PRODUCTION_COORDINATOR', 'ASSEMBLER'],
    condition: (data) => data.milestone === 'OUTSOURCED_PART_RECEIVED',
    messageTemplate: 'Outsourced part received for order {{poNumber}}. Check if assembly can resume.',
    priority: 'NORMAL'
  }
]

export class NotificationMatrix {
  /**
   * Process a workflow event and send appropriate notifications
   */
  static async processEvent(event: NotificationEvent): Promise<void> {
    try {
      // Find matching notification rules
      const matchingRules = NOTIFICATION_MATRIX.filter(rule => {
        if (rule.eventType !== event.type) return false
        if (rule.condition && !rule.condition(event.triggerData)) return false
        return true
      })

      if (matchingRules.length === 0) {
        console.log(`No notification rules found for event type: ${event.type}`)
        return
      }

      // Process each matching rule
      for (const rule of matchingRules) {
        await this.sendNotificationsForRule(event, rule)
      }

    } catch (error) {
      console.error('Error processing notification event:', error)
      throw error
    }
  }

  /**
   * Send notifications for a specific rule
   */
  private static async sendNotificationsForRule(
    event: NotificationEvent, 
    rule: NotificationRule
  ): Promise<void> {
    try {
      // Get users with matching roles
      const recipients = await prisma.user.findMany({
        where: {
          role: { in: rule.recipientRoles as any[] },
          isActive: true
        },
        select: {
          id: true,
          fullName: true,
          role: true
        }
      })

      if (recipients.length === 0) {
        console.warn(`No active users found for roles: ${rule.recipientRoles.join(', ')}`)
        return
      }

      // Generate message from template
      const message = this.populateMessageTemplate(rule.messageTemplate, {
        poNumber: event.poNumber,
        ...event.triggerData
      })

      // Create notifications for all recipients
      const notifications = recipients.map(recipient => ({
        userId: recipient.id,
        type: event.type,
        title: this.generateTitle(event.type, event.triggerData),
        message,
        priority: rule.priority,
        data: {
          orderId: event.orderId,
          poNumber: event.poNumber,
          eventType: event.type,
          ...event.triggerData
        }
      }))

      // Bulk create system notifications
      await prisma.systemNotification.createMany({
        data: notifications
      })

      console.log(`Sent ${notifications.length} notifications for event: ${event.type}`)

    } catch (error) {
      console.error('Error sending notifications for rule:', error)
      throw error
    }
  }

  /**
   * Populate message template with data
   */
  private static populateMessageTemplate(template: string, data: any): string {
    let message = template

    // Replace all {{key}} placeholders
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`
      const value = data[key]
      
      if (typeof value === 'boolean') {
        // Handle boolean values with contextual text
        if (key === 'requiresRework') {
          message = message.replace(placeholder, value ? 'Assembly rework required.' : 'No rework required.')
        } else {
          message = message.replace(placeholder, value ? 'Yes' : 'No')
        }
      } else {
        message = message.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value || ''))
      }
    })

    return message
  }

  /**
   * Generate appropriate title for notification type
   */
  private static generateTitle(eventType: string, data: any): string {
    switch (eventType) {
      case 'ORDER_STATUS_CHANGE':
        return `Order Status Update`
      case 'QC_FAILURE':
        return `QC ${data.qcType || 'Inspection'} Failed`
      case 'TASK_ASSIGNMENT':
        return `New Task Assigned`
      case 'PARTS_SHORTAGE':
        return `Parts Shortage Alert`
      case 'ASSEMBLY_MILESTONE':
        return `Assembly Milestone`
      default:
        return 'Workflow Notification'
    }
  }

  /**
   * Trigger order status change notifications
   */
  static async notifyOrderStatusChange(
    orderId: string,
    poNumber: string,
    oldStatus: string,
    newStatus: string,
    triggeredBy: string
  ): Promise<void> {
    await this.processEvent({
      type: 'ORDER_STATUS_CHANGE',
      orderId,
      poNumber,
      triggerData: { oldStatus, newStatus },
      triggeredBy
    })
  }

  /**
   * Trigger QC failure notifications
   */
  static async notifyQCFailure(
    orderId: string,
    poNumber: string,
    qcType: 'PRE_QC' | 'FINAL_QC',
    rejectionReason: string,
    requiresRework: boolean,
    triggeredBy: string
  ): Promise<void> {
    await this.processEvent({
      type: 'QC_FAILURE',
      orderId,
      poNumber,
      triggerData: { qcType, rejectionReason, requiresRework },
      triggeredBy
    })
  }

  /**
   * Trigger parts shortage notifications
   */
  static async notifyPartsShortage(
    orderId: string,
    poNumber: string,
    partDetails: string,
    triggeredBy: string
  ): Promise<void> {
    await this.processEvent({
      type: 'PARTS_SHORTAGE',
      orderId,
      poNumber,
      triggerData: { partDetails },
      triggeredBy
    })
  }

  /**
   * Trigger assembly milestone notifications
   */
  static async notifyAssemblyMilestone(
    orderId: string,
    poNumber: string,
    milestone: string,
    triggeredBy: string
  ): Promise<void> {
    await this.processEvent({
      type: 'ASSEMBLY_MILESTONE',
      orderId,
      poNumber,
      triggerData: { milestone },
      triggeredBy
    })
  }
}