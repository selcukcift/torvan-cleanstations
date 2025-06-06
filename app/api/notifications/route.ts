import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import notificationService from '@/src/services/notificationService'

// GET /api/notifications - Fetch notifications for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Authentication expired - please log in again',
          requiresLogin: true 
        },
        { status: 401 }
      )
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Fetch notifications
    const notifications = await notificationService.getNotificationsForUser(
      user.id,
      { limit, unreadOnly }
    )

    // Also get unread count
    const unreadCount = await notificationService.getUnreadCount(user.id)

    return NextResponse.json({
      notifications,
      unreadCount,
      success: true
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationId, markAll } = body

    if (!notificationId && !markAll) {
      return NextResponse.json(
        { error: 'Either notificationId or markAll must be provided' },
        { status: 400 }
      )
    }

    let result

    if (markAll) {
      // Mark all notifications as read
      const count = await notificationService.markAllNotificationsAsRead(user.id)
      result = {
        success: true,
        message: `Marked ${count} notifications as read`,
        count
      }
    } else {
      // Mark specific notification as read
      const notification = await notificationService.markNotificationAsRead(
        notificationId,
        user.id
      )

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found or unauthorized' },
          { status: 404 }
        )
      }

      result = {
        success: true,
        notification
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}