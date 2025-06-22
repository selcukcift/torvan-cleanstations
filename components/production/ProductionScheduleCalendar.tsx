"use client"

import { useState, useEffect } from "react"
import { nextJsApiClient } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Package,
  Settings,
  Filter,
  RefreshCw
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  poNumber: string
  customerName: string
  orderStatus: string
  wantDate: string
  createdAt: string
  buildNumbers: string[]
  estimatedDays?: number
  actualStartDate?: string
  estimatedCompletionDate?: string
}

interface ScheduleEvent {
  id: string
  orderId: string
  title: string
  date: Date
  type: 'deadline' | 'milestone' | 'start' | 'completion'
  status: 'upcoming' | 'today' | 'overdue' | 'completed'
  order: Order
}

const statusColors = {
  ORDER_CREATED: "bg-blue-100 text-blue-700 border-blue-200",
  SINK_BODY_EXTERNAL_PRODUCTION: "bg-purple-100 text-purple-700 border-purple-200",
  READY_FOR_PRE_QC: "bg-yellow-100 text-yellow-700 border-yellow-200",
  READY_FOR_PRODUCTION: "bg-orange-100 text-orange-700 border-orange-200",
  TESTING_COMPLETE: "bg-green-100 text-green-700 border-green-200",
  PACKAGING_COMPLETE: "bg-teal-100 text-teal-700 border-teal-200",
  READY_FOR_FINAL_QC: "bg-indigo-100 text-indigo-700 border-indigo-200",
  READY_FOR_SHIP: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SHIPPED: "bg-gray-100 text-gray-700 border-gray-200"
}

const eventTypeConfig = {
  deadline: { icon: AlertTriangle, color: "bg-red-100 text-red-700 border-red-200" },
  milestone: { icon: CheckCircle, color: "bg-blue-100 text-blue-700 border-blue-200" },
  start: { icon: Package, color: "bg-green-100 text-green-700 border-green-200" },
  completion: { icon: CheckCircle, color: "bg-purple-100 text-purple-700 border-purple-200" }
}

export function ProductionScheduleCalendar() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [orders, setOrders] = useState<Order[]>([])
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)

  useEffect(() => {
    fetchScheduleData()
  }, [currentDate, filterStatus])

  const fetchScheduleData = async () => {
    try {
      setLoading(true)
      
      // Fetch orders with date range around current month
      const startDate = startOfMonth(subMonths(currentDate, 1))
      const endDate = endOfMonth(addMonths(currentDate, 2))
      
      const response = await nextJsApiClient.get('/orders', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: filterStatus === 'all' ? undefined : filterStatus,
          includeScheduleData: true
        }
      })
      
      if (response.data.success) {
        const ordersData = response.data.data.orders || []
        setOrders(ordersData)
        
        // Generate calendar events from orders
        const scheduleEvents = generateEventsFromOrders(ordersData)
        setEvents(scheduleEvents)
      }
    } catch (error: any) {
      console.error('Error fetching schedule data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch schedule data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateEventsFromOrders = (ordersData: Order[]): ScheduleEvent[] => {
    const events: ScheduleEvent[] = []
    const today = new Date()
    
    ordersData.forEach(order => {
      const wantDate = new Date(order.wantDate)
      const createdDate = new Date(order.createdAt)
      
      // Add want date as deadline
      events.push({
        id: `${order.id}-deadline`,
        orderId: order.id,
        title: `Deadline: ${order.poNumber}`,
        date: wantDate,
        type: 'deadline',
        status: order.orderStatus === 'SHIPPED' ? 'completed' : 
                isSameDay(wantDate, today) ? 'today' :
                wantDate < today ? 'overdue' : 'upcoming',
        order
      })
      
      // Add estimated start date for production phase
      if (order.actualStartDate) {
        const startDate = new Date(order.actualStartDate)
        events.push({
          id: `${order.id}-start`,
          orderId: order.id,
          title: `Start: ${order.poNumber}`,
          date: startDate,
          type: 'start',
          status: 'completed',
          order
        })
      }
      
      // Add milestones based on status
      if (order.orderStatus === 'READY_FOR_PRODUCTION') {
        events.push({
          id: `${order.id}-production-ready`,
          orderId: order.id,
          title: `Production Ready: ${order.poNumber}`,
          date: new Date(),
          type: 'milestone',
          status: 'today',
          order
        })
      }
      
      // Add estimated completion date
      if (order.estimatedCompletionDate) {
        const completionDate = new Date(order.estimatedCompletionDate)
        events.push({
          id: `${order.id}-completion`,
          orderId: order.id,
          title: `Est. Completion: ${order.poNumber}`,
          date: completionDate,
          type: 'completion',
          status: order.orderStatus === 'SHIPPED' ? 'completed' :
                  isSameDay(completionDate, today) ? 'today' :
                  completionDate < today ? 'overdue' : 'upcoming',
          order
        })
      }
    })
    
    return events
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day))
  }

  const getFilteredEvents = () => {
    if (showOverdueOnly) {
      return events.filter(event => event.status === 'overdue')
    }
    return events
  }

  const renderCalendarDay = (day: Date) => {
    const dayEvents = getEventsForDay(day)
    const isToday = isSameDay(day, new Date())
    const isCurrentMonth = isSameMonth(day, currentDate)
    const isSelected = selectedDay && isSameDay(day, selectedDay)
    
    return (
      <div
        key={day.toISOString()}
        className={`
          min-h-[120px] p-2 border cursor-pointer transition-colors
          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
          ${isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          hover:bg-gray-50
        `}
        onClick={() => setSelectedDay(day)}
      >
        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-700' : ''}`}>
          {format(day, 'd')}
        </div>
        
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map(event => {
            const EventIcon = eventTypeConfig[event.type].icon
            return (
              <div
                key={event.id}
                className={`
                  text-xs p-1 rounded border flex items-center gap-1 truncate
                  ${eventTypeConfig[event.type].color}
                  ${event.status === 'overdue' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                `}
                title={event.title}
              >
                <EventIcon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{event.order.poNumber}</span>
              </div>
            )
          })}
          
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500 text-center">
              +{dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    )
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Production Schedule
              </CardTitle>
              <CardDescription>
                View and manage order timelines and deadlines
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                className={showOverdueOnly ? 'bg-red-50 text-red-700 border-red-200' : ''}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {showOverdueOnly ? 'Show All' : 'Overdue Only'}
              </Button>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="READY_FOR_PRODUCTION">Ready for Production</SelectItem>
                  <SelectItem value="TESTING_COMPLETE">Testing Complete</SelectItem>
                  <SelectItem value="PACKAGING_COMPLETE">Packaging Complete</SelectItem>
                  <SelectItem value="READY_FOR_FINAL_QC">Ready for Final QC</SelectItem>
                  <SelectItem value="READY_FOR_SHIP">Ready for Ship</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={fetchScheduleData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h3 className="text-lg font-semibold">
                    {format(currentDate, 'MMMM yyyy')}
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {getDaysInMonth().map(renderCalendarDay)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(eventTypeConfig).map(([type, config]) => {
                const IconComponent = config.icon
                return (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded ${config.color.split(' ')[0]}`} />
                    <IconComponent className="w-3 h-3" />
                    <span className="capitalize">{type}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Selected Day Events */}
          {selectedDay && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {format(selectedDay, 'MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayEvents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDayEvents.map(event => {
                      const EventIcon = eventTypeConfig[event.type].icon
                      return (
                        <div key={event.id} className="p-2 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <EventIcon className="w-4 h-4" />
                            <span className="font-medium text-sm">{event.order.poNumber}</span>
                            <Badge className={statusColors[event.order.orderStatus] || "bg-gray-100 text-gray-700"}>
                              {event.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600">
                            {event.order.customerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            Status: {event.order.orderStatus.replace(/_/g, ' ')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No events for this day</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Total Orders:</span>
                <span className="font-medium">{orders.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Overdue:</span>
                <span className="font-medium text-red-600">
                  {events.filter(e => e.status === 'overdue').length}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Due Today:</span>
                <span className="font-medium text-blue-600">
                  {events.filter(e => e.status === 'today').length}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>This Month:</span>
                <span className="font-medium">
                  {events.filter(e => isSameMonth(e.date, currentDate)).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}