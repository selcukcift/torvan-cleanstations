/**
 * Test Notification API
 * Send test notifications to verify notification preferences
 */
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
/**
 * POST /api/notifications/test
 * Send a test notification to verify user's notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    const body = await request.json()
    const { notificationType } = body
    if (!notificationType) {
      return NextResponse.json(
        { success: false, message: 'Notification type is required' },
        { status: 400 }
      )
    }
    // Get user's preference for this notification type
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId: user.id,
          notificationType
        }
      }
    })
    // Create test notification based on type
    const testNotifications = {
      ORDER_STATUS_CHANGE: {
        title: 'Test: Order Status Update',
        message: 'Order PO-2025-001 has been updated to "Ready for Production". This is a test notification.',
        data: { orderId: 'test-order-id', oldStatus: 'READY_FOR_PRE_QC', newStatus: 'READY_FOR_PRODUCTION' }
      },
      TASK_ASSIGNMENT: {
        title: 'Test: New Task Assigned',
        message: 'You have been assigned a new task: "Install LED Light Bracket". This is a test notification.',
        data: { taskId: 'test-task-id', taskTitle: 'Install LED Light Bracket' }
      },
      QC_APPROVAL_REQUIRED: {
        title: 'Test: QC Approval Required',
        message: 'Order PO-2025-001 is ready for Quality Control review. This is a test notification.',
        data: { orderId: 'test-order-id', qcType: 'PRE_QC' }
      },
      ASSEMBLY_MILESTONE: {
        title: 'Test: Assembly Milestone',
        message: 'Assembly milestone reached: "Testing Complete" for build T2-001. This is a test notification.',
        data: { orderId: 'test-order-id', buildNumber: 'T2-001', milestone: 'TESTING_COMPLETE' }
      },
      DEADLINE_APPROACHING: {
        title: 'Test: Deadline Approaching',
        message: 'Order PO-2025-001 want date is in 2 days (Jan 15, 2025). This is a test notification.',
        data: { orderId: 'test-order-id', wantDate: '2025-01-15', daysRemaining: 2 }
      },
      SYSTEM_ALERT: {
        title: 'Test: System Alert',
        message: 'System maintenance scheduled for tonight at 11 PM EST. This is a test notification.',
        data: { alertType: 'MAINTENANCE', scheduledTime: '2025-01-13T23:00:00Z' }
      }
    }
    const testNotification = testNotifications[notificationType as keyof typeof testNotifications]
    if (!testNotification) {
      return NextResponse.json(
        { success: false, message: 'Invalid notification type for testing' },
        { status: 400 }
      )
    }
    const results = []
    // Send in-app notification if enabled
    if (!preference || preference.inAppEnabled) {
      const systemNotification = await prisma.systemNotification.create({
        data: {
          userId: user.id,
          type: notificationType,
          title: testNotification.title,
          message: testNotification.message,
          data: testNotification.data,
          priority: 'NORMAL'
        }
      })
      results.push({
        type: 'in-app',
        status: 'sent',
        notificationId: systemNotification.id
      })
    } else {
      results.push({
        type: 'in-app',
        status: 'disabled',
        reason: 'In-app notifications disabled for this type'
      })
    }
    // Send email notification if enabled
    if (preference?.emailEnabled) {
      // For now, we'll just log the email that would be sent
      // In a real implementation, this would integrate with an email service
      const emailAddress = preference.emailAddress || user.email
      results.push({
        type: 'email',
        status: 'simulated',
        recipient: emailAddress,
        subject: testNotification.title,
        body: testNotification.message,
        note: 'Email service not implemented - this is a simulation'
      })
    } else {
      results.push({
        type: 'email',
        status: 'disabled',
        reason: 'Email notifications disabled for this type'
      })
    }
    return NextResponse.json({
      success: true,
      data: {
        notificationType,
        testResults: results,
        userPreference: preference ? {
          inAppEnabled: preference.inAppEnabled,
          emailEnabled: preference.emailEnabled,
          frequency: preference.frequency
        } : 'default preferences used'
      }
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}