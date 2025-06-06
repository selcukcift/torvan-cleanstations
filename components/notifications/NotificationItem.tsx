"use client"

import { formatDistanceToNow } from 'date-fns'
import { Circle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface NotificationItemProps {
  notification: {
    id: string
    message: string
    createdAt: string
    isRead: boolean
    type?: string
    linkToOrder?: string
  }
  onMarkAsRead?: (notificationId: string) => void
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const formattedTime = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })

  return (
    <div className={`relative p-3 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''}`}>
      {!notification.isRead && (
        <Circle className="absolute left-2 top-4 h-2 w-2 fill-blue-600 text-blue-600" />
      )}
      
      <div className={`${!notification.isRead ? 'pl-4' : ''}`}>
        <p className="text-sm text-gray-900">{notification.message}</p>
        
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-gray-500">{formattedTime}</span>
          
          {notification.linkToOrder && (
            <Link
              href={`/orders/${notification.linkToOrder}`}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View Order
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
          
          {!notification.isRead && onMarkAsRead && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}