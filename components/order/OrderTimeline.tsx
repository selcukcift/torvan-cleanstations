"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  FileText,
  Wrench,
  User,
  ArrowRight,
  Calendar,
  MessageSquare
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

interface TimelineEvent {
  id: string
  action: string
  timestamp: string
  user: {
    id: string
    fullName: string
  }
  oldStatus?: string
  newStatus?: string
  notes?: string
}

interface OrderTimelineProps {
  events: TimelineEvent[]
  currentStatus: string
}

const actionIcons: Record<string, any> = {
  ORDER_CREATED: FileText,
  STATUS_UPDATED: ArrowRight,
  BOM_GENERATED: Package,
  QC_COMPLETED: CheckCircle,
  PRODUCTION_STARTED: Wrench,
  NOTE_ADDED: MessageSquare,
  DEFAULT: Clock
}

const statusDisplayNames: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  PARTS_SENT_WAITING_ARRIVAL: "Parts Sent - Waiting Arrival",
  READY_FOR_PRE_QC: "Ready for Pre-QC",
  READY_FOR_PRODUCTION: "Ready for Production",
  TESTING_COMPLETE: "Testing Complete",
  PACKAGING_COMPLETE: "Packaging Complete",
  READY_FOR_FINAL_QC: "Ready for Final QC",
  READY_FOR_SHIP: "Ready for Ship",
  SHIPPED: "Shipped"
}

export function OrderTimeline({ events, currentStatus }: OrderTimelineProps) {
  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || actionIcons.DEFAULT
    return Icon
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ORDER_CREATED':
        return 'text-green-500'
      case 'STATUS_UPDATED':
        return 'text-blue-500'
      case 'QC_COMPLETED':
        return 'text-green-500'
      case 'PRODUCTION_STARTED':
        return 'text-orange-500'
      case 'NOTE_ADDED':
        return 'text-purple-500'
      default:
        return 'text-slate-400'
    }
  }

  const getActionTitle = (event: TimelineEvent) => {
    switch (event.action) {
      case 'ORDER_CREATED':
        return 'Order Created'
      case 'STATUS_UPDATED':
        return 'Status Updated'
      case 'BOM_GENERATED':
        return 'BOM Generated'
      case 'QC_COMPLETED':
        return 'Quality Check Completed'
      case 'PRODUCTION_STARTED':
        return 'Production Started'
      case 'NOTE_ADDED':
        return 'Note Added'
      default:
        return event.action
    }
  }

  const getUserInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Order Timeline</CardTitle>
            <CardDescription>Complete history of order activities</CardDescription>
          </div>
          <Badge variant="outline">
            {events.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
            
            <div className="space-y-6">
              {events.map((event, index) => {
                const Icon = getActionIcon(event.action)
                const isLast = index === events.length - 1
                
                return (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Icon circle */}
                    <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 ${
                      index === 0 ? 'border-green-500' : 'border-slate-300'
                    }`}>
                      <Icon className={`w-5 h-5 ${getActionColor(event.action)}`} />
                    </div>
                    
                    {/* Content */}
                    <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-slate-900">
                              {getActionTitle(event)}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <p className="text-xs text-slate-500">
                                {format(new Date(event.timestamp), "MMM dd, yyyy 'at' HH:mm")}
                                {' • '}
                                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          
                          {/* User avatar */}
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {getUserInitials(event.user.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-600">
                              {event.user.fullName}
                            </span>
                          </div>
                        </div>
                        
                        {/* Status change */}
                        {event.oldStatus && event.newStatus && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {statusDisplayNames[event.oldStatus]}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <Badge variant="outline" className="text-xs">
                              {statusDisplayNames[event.newStatus]}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Notes */}
                        {event.notes && (
                          <div className="bg-white rounded-md p-3 border border-slate-200">
                            <p className="text-sm text-slate-700">{event.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Current status indicator */}
              <div className="relative flex gap-4">
                <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 border-2 border-white shadow-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-blue-900">Current Status</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {statusDisplayNames[currentStatus] || currentStatus}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}