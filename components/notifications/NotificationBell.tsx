"use client"

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useSession } from 'next-auth/react'
import { nextJsApiClient } from '@/lib/api'
import { NotificationItem } from './NotificationItem'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  message: string
  createdAt: string
  isRead: boolean
  type?: string
  linkToOrder?: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()
  const { toast } = useToast()

  // Fetch unread notifications on mount and set up auto-refresh
  useEffect(() => {
    if (session?.user) {
      // Add a small delay to prevent blocking dashboard loading
      const timer = setTimeout(() => {
        fetchNotifications(true)
      }, 1000)
      
      // Auto-refresh every 30 seconds (Sprint 4.3 requirement)
      const interval = setInterval(() => {
        fetchNotifications(true)
      }, 30000)
      
      return () => {
        clearTimeout(timer)
        clearInterval(interval)
      }
    }
  }, [session?.user])

  // Fetch all notifications when popover opens
  useEffect(() => {
    if (isOpen && session?.user) {
      fetchNotifications(false)
    }
  }, [isOpen, session?.user])

  const fetchNotifications = async (unreadOnly: boolean) => {
    try {
      setIsLoading(true)
      const response = await nextJsApiClient.get('/notifications', {
        params: {
          limit: unreadOnly ? 5 : 10,
          unreadOnly
        },
        timeout: 5000 // 5 second timeout to prevent hanging
      })

      if (response.data.success) {
        if (!unreadOnly) {
          setNotifications(response.data.notifications)
        }
        setUnreadCount(response.data.unreadCount)
      }
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error.response?.status === 401) {
        console.log('Authentication expired - notifications unavailable')
        // Don't show error toast for auth issues, user will be redirected to login
        setUnreadCount(0)
        setNotifications([])
        return
      }
      
      // Handle timeout or network errors silently for dashboard loading
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.log('Notification fetch timed out - continuing with empty state')
        setUnreadCount(0)
        setNotifications([])
        return
      }
      
      console.error('Failed to fetch notifications:', error)
      // Set fallback state to prevent hanging
      setUnreadCount(0)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkOneRead = async (notificationId: string) => {
    try {
      const response = await nextJsApiClient.patch('/notifications', {
        notificationId
      })

      if (response.data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error.response?.status === 401) {
        console.log('Authentication expired - cannot mark notification as read')
        return
      }
      console.error('Failed to mark notification as read:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read"
      })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const response = await nextJsApiClient.patch('/notifications', {
        markAll: true
      })

      if (response.data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        )
        setUnreadCount(0)
        
        toast({
          variant: "success",
          title: "Success",
          description: `Marked ${response.data.count} notifications as read`
        })
      }
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error.response?.status === 401) {
        console.log('Authentication expired - cannot mark all notifications as read')
        return
      }
      console.error('Failed to mark all notifications as read:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all notifications as read"
      })
    }
  }

  if (!session?.user) {
    return null
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <Separator />
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkOneRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        <Separator />
        
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => {
              setIsOpen(false)
              // Placeholder for future notifications page
              toast({
                title: "Coming Soon",
                description: "A dedicated notifications page will be available soon"
              })
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}