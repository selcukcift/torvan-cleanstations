"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  CalendarDays,
  Download,
  CheckSquare,
  Square,
  UserPlus,
  Users,
  BarChart3,
  TrendingUp,
  Workflow,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Target,
  FolderOpen,
  Settings,
  Bell,
  BellOff,
  TestTube,
  Save,
  Mail,
  Printer
} from "lucide-react"
import { format } from "date-fns"
import { DocumentPreview } from "@/components/ui/document-preview"
import { ProductionScheduleCalendar } from "../production/ProductionScheduleCalendar"

// Status colors and display names
const statusColors: Record<string, string> = {
  ORDER_CREATED: "bg-blue-100 text-blue-700",
  SINK_BODY_EXTERNAL_PRODUCTION: "bg-purple-100 text-purple-700",
  READY_FOR_PRE_QC: "bg-yellow-100 text-yellow-700",
  READY_FOR_PRODUCTION: "bg-orange-100 text-orange-700",
  TESTING_COMPLETE: "bg-green-100 text-green-700",
  PACKAGING_COMPLETE: "bg-teal-100 text-teal-700",
  READY_FOR_FINAL_QC: "bg-indigo-100 text-indigo-700",
  READY_FOR_SHIP: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-gray-100 text-gray-700"
}

const statusDisplayNames: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  SINK_BODY_EXTERNAL_PRODUCTION: "External Production",
  READY_FOR_PRE_QC: "Ready for Pre-QC",
  READY_FOR_PRODUCTION: "Ready for Production",
  TESTING_COMPLETE: "Testing Complete",
  PACKAGING_COMPLETE: "Packaging Complete",
  READY_FOR_FINAL_QC: "Ready for Final QC",
  READY_FOR_SHIP: "Ready to Ship",
  SHIPPED: "Shipped"
}

// Production Coordinator relevant statuses
const PC_RELEVANT_STATUSES = [
  "ORDER_CREATED",
  "SINK_BODY_EXTERNAL_PRODUCTION",
  "READY_FOR_PRE_QC",
  "READY_FOR_PRODUCTION",
  "TESTING_COMPLETE",
  "PACKAGING_COMPLETE",
  "READY_FOR_FINAL_QC",
  "READY_FOR_SHIP"
]

export function ProductionCoordinatorDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const ordersPerPage = 10

  // Advanced search states
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [customerNameFilter, setCustomerNameFilter] = useState("")
  const [buildNumberFilter, setBuildNumberFilter] = useState("")
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>()
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>()
  const [dateTypeFilter, setDateTypeFilter] = useState("createdAt")

  // Bulk operations states
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Assignment states
  const [assignableUsers, setAssignableUsers] = useState<any[]>([])
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [assignmentOrderId, setAssignmentOrderId] = useState<string | null>(null)

  // Reports states
  const [showReports, setShowReports] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportType, setReportType] = useState("summary")
  const [reportPeriod, setReportPeriod] = useState("week")

  // Workflow tracker states
  const [showWorkflow, setShowWorkflow] = useState(false)
  const [workflowData, setWorkflowData] = useState<any>(null)
  const [workflowLoading, setWorkflowLoading] = useState(false)

  // QC Overview states
  const [showQcOverview, setShowQcOverview] = useState(false)
  const [qcData, setQcData] = useState<any>(null)
  const [qcLoading, setQcLoading] = useState(false)

  // Document preview states
  const [previewDocument, setPreviewDocument] = useState<any>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  // Notification settings states
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationPreferences, setNotificationPreferences] = useState<any[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [testNotificationLoading, setTestNotificationLoading] = useState<string | null>(null)

  // Dashboard statistics
  const [stats, setStats] = useState({
    totalActive: 0,
    awaitingParts: 0,
    inProduction: 0,
    readyToShip: 0
  })

  // View management
  const [currentView, setCurrentView] = useState<'orders' | 'calendar' | 'service-requests'>('orders')
  
  // Service requests state
  const [serviceRequests, setServiceRequests] = useState<any[]>([])
  const [serviceRequestsLoading, setServiceRequestsLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchOrders()
      // Clear selection when filters change
      setSelectedOrders([])
    }
  }, [currentPage, statusFilter, searchTerm, customerNameFilter, buildNumberFilter, dateFromFilter, dateToFilter, dateTypeFilter, status, session])

  // Clear selection when bulk actions mode is turned off
  useEffect(() => {
    if (!showBulkActions) {
      setSelectedOrders([])
    }
  }, [showBulkActions])

  // Auto-refresh when window regains focus (useful when returning from order creation)
  useEffect(() => {
    const handleFocus = () => {
      if (status === 'authenticated' && session?.user) {
        fetchOrders()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [status, session])

  // Also refresh when component mounts - but only after session is ready
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchOrders()
      fetchAssignableUsers()
    }
  }, [status, session])

  const fetchAssignableUsers = async () => {
    try {
      const response = await nextJsApiClient.get('/users/assignable')
      if (response.data.success) {
        setAssignableUsers(response.data.data.users)
      }
    } catch (error) {
      console.error('Error fetching assignable users:', error)
    }
  }

  const fetchReports = async () => {
    setReportLoading(true)
    try {
      const params = new URLSearchParams({
        type: reportType,
        period: reportPeriod
      })

      const response = await nextJsApiClient.get(`/reports/production?${params}`)
      if (response.data.success) {
        setReportData(response.data.data)
      } else {
        throw new Error(response.data.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to generate report: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setReportLoading(false)
    }
  }

  const fetchWorkflow = async () => {
    setWorkflowLoading(true)
    try {
      const response = await nextJsApiClient.get('/workflow/status?includeHistory=true')
      if (response.data.success) {
        setWorkflowData(response.data.data)
      } else {
        throw new Error(response.data.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load workflow data: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setWorkflowLoading(false)
    }
  }

  const fetchQcData = async () => {
    setQcLoading(true)
    try {
      const response = await nextJsApiClient.get('/qc/status-overview?includeTrends=true')
      if (response.data.success) {
        setQcData(response.data.data)
      } else {
        throw new Error(response.data.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load QC data: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setQcLoading(false)
    }
  }

  const fetchNotificationPreferences = async () => {
    setNotificationsLoading(true)
    try {
      const response = await nextJsApiClient.get('/notifications/preferences')
      if (response.data.success) {
        setNotificationPreferences(response.data.data.preferences)
      } else {
        throw new Error(response.data.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load notification preferences: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setNotificationsLoading(false)
    }
  }

  const updateNotificationPreferences = async () => {
    setNotificationsSaving(true)
    try {
      const response = await nextJsApiClient.post('/notifications/preferences', {
        preferences: notificationPreferences
      })
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Notification preferences updated successfully",
        })
      } else {
        throw new Error(response.data.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update preferences: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setNotificationsSaving(false)
    }
  }

  const testNotification = async (notificationType: string) => {
    setTestNotificationLoading(notificationType)
    try {
      const response = await nextJsApiClient.post('/notifications/test', {
        notificationType
      })
      if (response.data.success) {
        toast({
          title: "Test Notification Sent",
          description: `Test notification sent for ${notificationType}. Check your notifications and email.`,
        })
      } else {
        throw new Error(response.data.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send test notification: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setTestNotificationLoading(null)
    }
  }

  const updatePreference = (notificationType: string, field: string, value: any) => {
    setNotificationPreferences(prev => 
      prev.map(pref => 
        pref.notificationType === notificationType 
          ? { ...pref, [field]: value }
          : pref
      )
    )
  }

  // Notification type display names and descriptions
  const notificationTypeInfo = {
    ORDER_STATUS_CHANGE: {
      name: "Order Status Changes",
      description: "When order status is updated (e.g., Ready for Production → Testing Complete)"
    },
    TASK_ASSIGNMENT: {
      name: "Task Assignments", 
      description: "When tasks are assigned to team members"
    },
    QC_APPROVAL_REQUIRED: {
      name: "QC Approval Required",
      description: "When orders need QC review (Pre-QC or Final QC)"
    },
    ASSEMBLY_MILESTONE: {
      name: "Assembly Milestones",
      description: "When assembly milestones are reached"
    },
    DEADLINE_APPROACHING: {
      name: "Deadline Approaching",
      description: "When order want dates are approaching"
    },
    SYSTEM_ALERT: {
      name: "System Alerts",
      description: "Important system notifications and maintenance alerts"
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ordersPerPage.toString()
      })
      
      if (statusFilter !== "ALL") {
        params.append("status", statusFilter)
      }
      
      if (searchTerm) {
        params.append("poNumber", searchTerm)
      }

      if (customerNameFilter) {
        params.append("customerName", customerNameFilter)
      }

      if (buildNumberFilter) {
        params.append("buildNumber", buildNumberFilter)
      }

      if (dateFromFilter) {
        params.append("dateFrom", dateFromFilter.toISOString().split('T')[0])
      }

      if (dateToFilter) {
        params.append("dateTo", dateToFilter.toISOString().split('T')[0])
      }

      if (dateTypeFilter) {
        params.append("dateType", dateTypeFilter)
      }

      const response = await nextJsApiClient.get(`/orders?${params}`)
      
      if (response.data.success) {
        setOrders(response.data.data)
        setTotalPages(response.data.pagination.pages)
        setTotalOrders(response.data.pagination.total)
        
        // Calculate statistics
        calculateStats(response.data.data)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (ordersList: any[]) => {
    const stats = {
      totalActive: 0,
      awaitingParts: 0,
      inProduction: 0,
      readyToShip: 0
    }

    ordersList.forEach(order => {
      if (order.orderStatus !== "SHIPPED") {
        stats.totalActive++
      }
      
      if (order.orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION") {
        stats.awaitingParts++
      }
      
      if (["READY_FOR_PRODUCTION", "TESTING_COMPLETE", "PACKAGING_COMPLETE"].includes(order.orderStatus)) {
        stats.inProduction++
      }
      
      if (order.orderStatus === "READY_FOR_SHIP") {
        stats.readyToShip++
      }
    })

    setStats(stats)
  }

  const fetchServiceRequests = async () => {
    setServiceRequestsLoading(true)
    try {
      const response = await nextJsApiClient.get("/service-orders?fulfillmentMethod=PRODUCTION_TEAM&status=APPROVED")
      
      if (response.data.success) {
        setServiceRequests(response.data.data.serviceOrders || [])
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch service requests",
        variant: "destructive"
      })
    } finally {
      setServiceRequestsLoading(false)
    }
  }

  const handleCompleteServiceRequest = async (serviceOrderId: string) => {
    try {
      const response = await nextJsApiClient.put(`/service-orders/${serviceOrderId}`, {
        status: "RECEIVED",
        notes: "Completed by production team"
      })
      
      if (response.data.success) {
        toast({
          title: "Service Request Completed",
          description: "Service request has been marked as completed"
        })
        fetchServiceRequests() // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to complete service request",
        variant: "destructive"
      })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchOrders()
  }

  const navigateToOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const createNewOrder = () => {
    router.push("/orders/create")
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("ALL")
    setCustomerNameFilter("")
    setBuildNumberFilter("")
    setDateFromFilter(undefined)
    setDateToFilter(undefined)
    setDateTypeFilter("createdAt")
    setCurrentPage(1)
  }

  const hasActiveFilters = () => {
    return searchTerm || statusFilter !== "ALL" || customerNameFilter || 
           buildNumberFilter || dateFromFilter || dateToFilter
  }

  // Bulk operations functions
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map(order => order.id))
    }
  }

  const clearSelection = () => {
    setSelectedOrders([])
    setShowBulkActions(false)
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.length === 0) return

    setBulkActionLoading(true)
    try {
      const updatePromises = selectedOrders.map(orderId =>
        nextJsApiClient.patch(`/orders/${orderId}/status`, { status: newStatus })
      )

      await Promise.all(updatePromises)
      
      toast({
        title: "Success",
        description: `Updated ${selectedOrders.length} orders to ${statusDisplayNames[newStatus]}`,
      })

      // Refresh orders and clear selection
      await fetchOrders()
      clearSelection()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update orders: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkExport = async () => {
    if (selectedOrders.length === 0) return

    try {
      // Create CSV content
      const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))
      const csvHeaders = ['PO Number', 'Customer', 'Order Date', 'Want Date', 'Status', 'Build Numbers']
      const csvRows = selectedOrdersData.map(order => [
        order.poNumber,
        order.customerName,
        format(new Date(order.createdAt), "yyyy-MM-dd"),
        format(new Date(order.wantDate), "yyyy-MM-dd"),
        statusDisplayNames[order.orderStatus] || order.orderStatus,
        order.buildNumbers.join(', ')
      ])

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orders-export-${format(new Date(), "yyyy-MM-dd")}.csv`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: `Exported ${selectedOrders.length} orders to CSV`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export orders",
        variant: "destructive"
      })
    }
  }

  // Helper function to determine if assignment UI should be shown for an order
  const shouldShowAssignmentOption = (orderStatus: string): boolean => {
    // Only show assignment option when order reaches certain states
    const assignableStates = [
      'ORDER_CREATED',
      'SINK_BODY_EXTERNAL_PRODUCTION',
      'READY_FOR_PRE_QC', 
      'READY_FOR_FINAL_QC',
      'READY_FOR_PRODUCTION',
      'TESTING_COMPLETE',
      'PACKAGING_COMPLETE',
      'READY_FOR_SHIP',
      'SHIPPED'
    ]

    return assignableStates.includes(orderStatus)
  }

  // Helper function to validate if order can be assigned
  const canAssignOrder = (orderStatus: string, userRole?: string): { canAssign: boolean; reason?: string } => {
    const productionReadyStates = [
      'READY_FOR_PRODUCTION',
      'TESTING_COMPLETE', 
      'PACKAGING_COMPLETE',
      'READY_FOR_FINAL_QC',
      'READY_FOR_SHIP',
      'SHIPPED'
    ]

    switch (orderStatus) {
      case 'ORDER_CREATED':
      case 'SINK_BODY_EXTERNAL_PRODUCTION':
        if (userRole && userRole !== 'PROCUREMENT_SPECIALIST') {
          return { 
            canAssign: false, 
            reason: `Orders with status "${orderStatus}" can only be assigned to Procurement Specialists. Order must advance to "Ready for Production" before assigning to production department.`
          }
        }
        return { canAssign: true }

      case 'READY_FOR_PRE_QC':
      case 'READY_FOR_FINAL_QC':
        if (userRole && userRole !== 'QC_PERSON') {
          return { 
            canAssign: false, 
            reason: `Orders with status "${orderStatus}" can only be assigned to QC Personnel.`
          }
        }
        return { canAssign: true }

      case 'READY_FOR_PRODUCTION':
      case 'TESTING_COMPLETE':
      case 'PACKAGING_COMPLETE':
        if (userRole && userRole !== 'ASSEMBLER') {
          return { 
            canAssign: false, 
            reason: `Orders with status "${orderStatus}" can only be assigned to Production Department members (Assemblers).`
          }
        }
        return { canAssign: true }

      case 'READY_FOR_SHIP':
      case 'SHIPPED':
        if (userRole && !['ASSEMBLER', 'QC_PERSON'].includes(userRole)) {
          return { 
            canAssign: false, 
            reason: `Orders with status "${orderStatus}" can only be assigned to Assemblers or QC Personnel.`
          }
        }
        return { canAssign: true }

      default:
        return { canAssign: true }
    }
  }

  const handleSingleAssignment = async (orderId: string, assigneeId: string | null) => {
    try {
      setAssignmentLoading(true)
      
      // Client-side validation
      if (assigneeId) {
        const order = orders.find(o => o.id === orderId)
        const assignee = assignableUsers.find(u => u.id === assigneeId)
        
        if (order && assignee) {
          const validation = canAssignOrder(order.orderStatus, assignee.role)
          if (!validation.canAssign) {
            toast({
              title: "Assignment Not Allowed",
              description: validation.reason,
              variant: "destructive"
            })
            return
          }
        }
      }

      const response = await nextJsApiClient.patch(`/orders/${orderId}/assign`, {
        assigneeId
      })

      if (response.data.success) {
        toast({
          title: "Success",
          description: assigneeId 
            ? `Order assigned to ${response.data.data.assignee?.fullName}` 
            : "Order assignment removed",
        })
        await fetchOrders()
      } else {
        throw new Error(response.data.message)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update assignment: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setAssignmentLoading(false)
    }
  }

  const handleBulkAssignment = async (assigneeId: string | null) => {
    if (selectedOrders.length === 0) return

    setBulkActionLoading(true)
    try {
      // Pre-validate assignments if assigneeId is provided
      if (assigneeId) {
        const assignee = assignableUsers.find(u => u.id === assigneeId)
        if (assignee) {
          const selectedOrderData = orders.filter(o => selectedOrders.includes(o.id))
          const invalidAssignments = selectedOrderData.filter(order => {
            const validation = canAssignOrder(order.orderStatus, assignee.role)
            return !validation.canAssign
          })

          if (invalidAssignments.length > 0) {
            const firstInvalid = invalidAssignments[0]
            const validation = canAssignOrder(firstInvalid.orderStatus, assignee.role)
            toast({
              title: "Bulk Assignment Failed",
              description: `Cannot assign ${assignee.fullName} to ${invalidAssignments.length} order(s). ${validation.reason}`,
              variant: "destructive"
            })
            return
          }
        }
      }

      const assignmentPromises = selectedOrders.map(orderId =>
        nextJsApiClient.patch(`/orders/${orderId}/assign`, { assigneeId })
      )

      await Promise.all(assignmentPromises)
      
      const assigneeName = assigneeId 
        ? assignableUsers.find(u => u.id === assigneeId)?.fullName 
        : null

      toast({
        title: "Success",
        description: assigneeId
          ? `Assigned ${selectedOrders.length} orders to ${assigneeName}`
          : `Removed assignment from ${selectedOrders.length} orders`,
      })

      // Refresh orders and clear selection
      await fetchOrders()
      clearSelection()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update assignments: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Handle order documents preview
  const handleViewDocuments = async (orderId: string) => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}`)
      if (response.data.success) {
        const order = response.data.data
        if (order.associatedDocuments && order.associatedDocuments.length > 0) {
          // Open the first document for preview, or could show a selection dialog
          const firstDoc = order.associatedDocuments[0]
          setPreviewDocument({
            id: firstDoc.id,
            filename: firstDoc.docName,
            originalName: firstDoc.docName,
            mimeType: firstDoc.mimeType || 'application/octet-stream',
            size: firstDoc.fileSize || 0,
            uploadedAt: firstDoc.timestamp,
            uploadedBy: firstDoc.uploadedBy || 'Unknown',
            category: firstDoc.docType
          })
          setPreviewModalOpen(true)
        } else {
          toast({
            title: "No Documents",
            description: "This order has no associated documents",
            variant: "default"
          })
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load order documents",
        variant: "destructive"
      })
    }
  }

  const handleCheckDeadlines = async () => {
    try {
      const response = await nextJsApiClient.post('/admin/system/check-deadlines')
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Deadline check completed successfully",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to run deadline check",
        variant: "destructive"
      })
    }
  }

  const handlePrintReport = () => {
    // Open print report in new window
    const params = new URLSearchParams({
      type: reportType,
      period: reportPeriod
    })
    
    const printUrl = `/reports/production/print?${params}`
    window.open(printUrl, '_blank')
  }

  // Show loading while session is being loaded
  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (status === 'unauthenticated' || !session?.user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Coordinator Dashboard</h2>
          <p className="text-slate-600">Manage orders and track production status</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={createNewOrder}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Order
          </Button>
          <Button onClick={handleCheckDeadlines} variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Check Deadlines
          </Button>
          <Button 
            onClick={() => {
              const nextView = currentView === 'orders' ? 'calendar' : 'orders'
              setCurrentView(nextView)
            }}
            variant={currentView === 'calendar' ? "default" : "outline"}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {currentView === 'calendar' ? 'Orders View' : 'Calendar View'}
          </Button>
          <Button 
            onClick={() => {
              setCurrentView('service-requests')
              if (serviceRequests.length === 0) {
                fetchServiceRequests()
              }
            }}
            variant={currentView === 'service-requests' ? "default" : "outline"}
          >
            <Package className="w-4 h-4 mr-2" />
            Service Requests
          </Button>
          <Button 
            onClick={() => setShowReports(!showReports)}
            variant={showReports ? "default" : "outline"}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </Button>
          <Button 
            onClick={() => {
              setShowWorkflow(!showWorkflow)
              if (!showWorkflow && !workflowData) {
                fetchWorkflow()
              }
            }}
            variant={showWorkflow ? "default" : "outline"}
          >
            <Workflow className="w-4 h-4 mr-2" />
            Workflow
          </Button>
          <Button 
            onClick={() => {
              setShowQcOverview(!showQcOverview)
              if (!showQcOverview && !qcData) {
                fetchQcData()
              }
            }}
            variant={showQcOverview ? "default" : "outline"}
          >
            <Shield className="w-4 h-4 mr-2" />
            QC Overview
          </Button>
          <Button 
            onClick={() => {
              setShowNotifications(!showNotifications)
              if (!showNotifications && notificationPreferences.length === 0) {
                fetchNotificationPreferences()
              }
            }}
            variant={showNotifications ? "default" : "outline"}
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalActive}</span>
              <Package className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Awaiting Parts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.awaitingParts}</span>
              <Clock className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              In Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.inProduction}</span>
              <AlertCircle className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Ready to Ship
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.readyToShip}</span>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Tracker Section */}
      {showWorkflow && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Production Workflow Tracker</CardTitle>
                <CardDescription>
                  Real-time view of order progress through production stages
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={fetchWorkflow} 
                  size="sm"
                  variant="outline"
                  disabled={workflowLoading}
                >
                  {workflowLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {workflowLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading workflow data...</span>
              </div>
            ) : workflowData ? (
              <div className="space-y-6">
                {/* Workflow Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Active Orders</p>
                          <p className="text-2xl font-bold">{workflowData.metrics.totalActiveOrders}</p>
                        </div>
                        <Package className="w-8 h-8 text-blue-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Bottlenecks</p>
                          <p className="text-2xl font-bold text-red-600">{workflowData.metrics.bottleneckCount}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Flow Efficiency</p>
                          <p className="text-2xl font-bold">{workflowData.metrics.flowEfficiency}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Completed</p>
                          <p className="text-2xl font-bold">{workflowData.metrics.totalShippedOrders}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Visual Workflow Pipeline */}
                <div className="bg-slate-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <GitBranch className="w-5 h-5 mr-2" />
                    Production Pipeline
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {workflowData.stages.filter((stage: any) => stage.id !== 'SHIPPED').map((stage: any, index: number) => (
                      <div key={stage.id} className="relative">
                        {/* Stage Card */}
                        <Card className={`transition-all duration-200 hover:scale-105 cursor-pointer ${
                          stage.isBottleneck 
                            ? 'border-red-500 bg-red-50 shadow-lg' 
                            : stage.count > 0 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-slate-200'
                        }`}
                        onClick={() => {
                          // Filter orders table by this status
                          setStatusFilter(stage.id)
                          setCurrentPage(1)
                        }}
                        >
                          <CardContent className="p-4 text-center">
                            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                              stage.isBottleneck 
                                ? 'bg-red-500' 
                                : stage.count > 0 
                                  ? `bg-${stage.color}-500` 
                                  : 'bg-slate-300'
                            }`}>
                              <span className="text-white font-bold text-lg">{stage.count}</span>
                            </div>
                            
                            <h4 className="font-semibold text-sm mb-1">{stage.name}</h4>
                            <p className="text-xs text-slate-600 mb-2">{stage.description}</p>
                            
                            {stage.target && (
                              <Badge variant="outline" className="text-xs">
                                {stage.target.replace('_', ' ')}
                              </Badge>
                            )}
                            
                            {stage.isBottleneck && (
                              <div className="flex items-center justify-center mt-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600 ml-1">Bottleneck</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Arrow to next stage */}
                        {index < workflowData.stages.filter((s: any) => s.id !== 'SHIPPED').length - 1 && (
                          <div className="hidden lg:block absolute top-1/2 -right-8 transform -translate-y-1/2">
                            <ArrowRight className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Completed Stage */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-center">
                      <Card className="border-green-500 bg-green-50">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-green-500">
                            <span className="text-white font-bold text-lg">
                              {workflowData.stages.find((s: any) => s.id === 'SHIPPED')?.count || 0}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm mb-1">Shipped</h4>
                          <p className="text-xs text-slate-600">Completed orders</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* Bottleneck Analysis */}
                {workflowData.metrics.bottleneckCount > 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                      <h3 className="font-semibold text-red-800">Bottleneck Alert</h3>
                    </div>
                    <p className="text-red-700 text-sm">
                      {workflowData.metrics.bottleneckCount} stage(s) have higher than normal order volumes. 
                      Consider reassigning resources or investigating delays.
                    </p>
                    <div className="mt-2">
                      {workflowData.stages.filter((s: any) => s.isBottleneck).map((stage: any) => (
                        <Badge key={stage.id} variant="destructive" className="mr-2">
                          {stage.name}: {stage.count} orders
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <div className="text-sm text-slate-600 text-center">
                  Last updated: {format(new Date(workflowData.lastUpdated), "PPpp")}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Workflow className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Click refresh to load workflow data</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* QC Status Overview Section */}
      {showQcOverview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>QC Status Overview</CardTitle>
                <CardDescription>
                  Quality control queues, metrics, and alerts
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={fetchQcData} 
                  size="sm"
                  variant="outline"
                  disabled={qcLoading}
                >
                  {qcLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {qcLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading QC data...</span>
              </div>
            ) : qcData ? (
              <div className="space-y-6">
                {/* QC Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Pre-QC Queue</p>
                          <p className="text-2xl font-bold">{qcData.summary.preQcQueue}</p>
                        </div>
                        <ShieldAlert className="w-8 h-8 text-yellow-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Final QC Queue</p>
                          <p className="text-2xl font-bold">{qcData.summary.finalQcQueue}</p>
                        </div>
                        <ShieldCheck className="w-8 h-8 text-indigo-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Pass Rate (7d)</p>
                          <p className="text-2xl font-bold">{qcData.summary.qcPassRate}%</p>
                          <p className="text-xs text-slate-500">
                            {qcData.summary.passedQc}/{qcData.summary.totalQcResults} passed
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-green-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Avg Wait Time</p>
                          <p className="text-lg font-bold">
                            {qcData.summary.avgWaitTimes.preQc}h / {qcData.summary.avgWaitTimes.finalQc}h
                          </p>
                          <p className="text-xs text-slate-500">Pre-QC / Final QC</p>
                        </div>
                        <Clock className="w-8 h-8 text-orange-500 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Priority Alerts */}
                {qcData.priorityAlerts && qcData.priorityAlerts.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                      Priority Alerts
                    </h3>
                    {qcData.priorityAlerts.map((alert: any, index: number) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                          alert.type === 'error' 
                            ? 'bg-red-50 border-red-200 text-red-800' 
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{alert.message}</span>
                          <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                            {alert.count}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* QC Queues */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pre-QC Queue */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center">
                      <ShieldAlert className="w-5 h-5 mr-2 text-yellow-500" />
                      Pre-QC Queue ({qcData.summary.preQcQueue})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {qcData.queues.preQc.length > 0 ? (
                        qcData.queues.preQc.map((order: any) => (
                          <Card key={order.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{order.poNumber}</p>
                                <p className="text-xs text-slate-600">{order.customerName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">
                                  {format(new Date(order.createdAt), "MMM dd")}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No orders in Pre-QC queue</p>
                      )}
                    </div>
                  </div>

                  {/* Final QC Queue */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center">
                      <ShieldCheck className="w-5 h-5 mr-2 text-indigo-500" />
                      Final QC Queue ({qcData.summary.finalQcQueue})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {qcData.queues.finalQc.length > 0 ? (
                        qcData.queues.finalQc.map((order: any) => (
                          <Card key={order.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{order.poNumber}</p>
                                <p className="text-xs text-slate-600">{order.customerName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">
                                  {format(new Date(order.updatedAt), "MMM dd")}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {Math.floor((Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24))}d
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No orders in Final QC queue</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* QC Person Workload */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-500" />
                    QC Person Workload
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {qcData.qcPersonWorkload.map((person: any) => (
                      <Card key={person.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{person.fullName}</p>
                              <p className="text-xs text-slate-600">QC Person</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{person._count.assignedOrders}</p>
                              <p className="text-xs text-slate-500">assigned</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Recent Failed QC Items */}
                {qcData.failedQcItems && qcData.failedQcItems.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center">
                      <X className="w-5 h-5 mr-2 text-red-500" />
                      Recent QC Failures ({qcData.failedQcItems.length})
                    </h3>
                    <div className="space-y-2">
                      {qcData.failedQcItems.slice(0, 5).map((failure: any) => (
                        <Card key={failure.id} className="p-3 border-red-200 bg-red-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{failure.order.poNumber}</p>
                              <p className="text-xs text-slate-600">{failure.order.customerName}</p>
                              <p className="text-xs text-red-600">
                                {failure.qcFormTemplate.formType} - {failure.performedBy.fullName}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="destructive" className="text-xs">FAILED</Badge>
                              <p className="text-xs text-slate-500 mt-1">
                                {format(new Date(failure.createdAt), "MMM dd, HH:mm")}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <div className="text-sm text-slate-600 text-center">
                  Last updated: {format(new Date(qcData.lastUpdated), "PPpp")}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Click refresh to load QC data</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Settings Section */}
      {showNotifications && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure your notification preferences for different event types
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={fetchNotificationPreferences} 
                  size="sm"
                  variant="outline"
                  disabled={notificationsLoading}
                >
                  {notificationsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  onClick={updateNotificationPreferences} 
                  size="sm"
                  disabled={notificationsSaving || notificationPreferences.length === 0}
                >
                  {notificationsSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading notification settings...</span>
              </div>
            ) : notificationPreferences.length > 0 ? (
              <div className="space-y-6">
                {/* Notification Preferences Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/4">Notification Type</TableHead>
                        <TableHead className="w-20 text-center">In-App</TableHead>
                        <TableHead className="w-20 text-center">Email</TableHead>
                        <TableHead className="w-32">Frequency</TableHead>
                        <TableHead className="w-32">Custom Email</TableHead>
                        <TableHead className="w-24">Quiet Hours</TableHead>
                        <TableHead className="w-20 text-center">Test</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notificationPreferences.map((pref) => (
                        <TableRow key={pref.notificationType}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">
                                {notificationTypeInfo[pref.notificationType as keyof typeof notificationTypeInfo]?.name || pref.notificationType}
                              </p>
                              <p className="text-xs text-slate-600">
                                {notificationTypeInfo[pref.notificationType as keyof typeof notificationTypeInfo]?.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={pref.inAppEnabled}
                              onCheckedChange={(checked) => updatePreference(pref.notificationType, 'inAppEnabled', checked)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={pref.emailEnabled}
                              onCheckedChange={(checked) => updatePreference(pref.notificationType, 'emailEnabled', checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={pref.frequency} 
                              onValueChange={(value) => updatePreference(pref.notificationType, 'frequency', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                                <SelectItem value="HOURLY">Hourly</SelectItem>
                                <SelectItem value="DAILY">Daily</SelectItem>
                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="email"
                              placeholder="Alternate email"
                              value={pref.emailAddress || ''}
                              onChange={(e) => updatePreference(pref.notificationType, 'emailAddress', e.target.value)}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Select 
                                value={pref.quietHoursStart?.toString() || 'none'} 
                                onValueChange={(value) => updatePreference(pref.notificationType, 'quietHoursStart', value === 'none' ? null : parseInt(value))}
                              >
                                <SelectTrigger className="w-16">
                                  <SelectValue placeholder="--" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {i.toString().padStart(2, '0')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs text-slate-500">to</span>
                              <Select 
                                value={pref.quietHoursEnd?.toString() || 'none'} 
                                onValueChange={(value) => updatePreference(pref.notificationType, 'quietHoursEnd', value === 'none' ? null : parseInt(value))}
                              >
                                <SelectTrigger className="w-16">
                                  <SelectValue placeholder="--" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {i.toString().padStart(2, '0')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testNotification(pref.notificationType)}
                              disabled={testNotificationLoading === pref.notificationType}
                            >
                              {testNotificationLoading === pref.notificationType ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <TestTube className="w-3 h-3" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Help Text */}
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-start space-x-2">
                    <Bell className="w-4 h-4 mt-0.5 text-blue-500" />
                    <div>
                      <p className="font-medium">In-App Notifications:</p>
                      <p>Notifications will appear in the system notification bell.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Mail className="w-4 h-4 mt-0.5 text-green-500" />
                    <div>
                      <p className="font-medium">Email Notifications:</p>
                      <p>Notifications will be sent to your email address (or the custom email if specified).</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Clock className="w-4 h-4 mt-0.5 text-purple-500" />
                    <div>
                      <p className="font-medium">Quiet Hours:</p>
                      <p>Email notifications will not be sent during these hours (24-hour format). In-app notifications are not affected.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <TestTube className="w-4 h-4 mt-0.5 text-orange-500" />
                    <div>
                      <p className="font-medium">Test Notifications:</p>
                      <p>Click the test button to verify your notification settings are working correctly.</p>
                    </div>
                  </div>
                </div>

                {/* Save Reminder */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm text-blue-800">
                      Remember to click "Save Settings" after making changes to update your preferences.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Click refresh to load notification settings</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports Section */}
      {showReports && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Production Reports</CardTitle>
                <CardDescription>
                  Analyze production performance and trends
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="completion">Completion Rate</SelectItem>
                    <SelectItem value="cycle-times">Cycle Times</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={fetchReports} disabled={reportLoading}>
                  {reportLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                </Button>

                {reportData && (
                  <Button 
                    onClick={() => handlePrintReport()}
                    variant="outline"
                    size="sm"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Report
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Generating report...</span>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Summary Report */}
                {reportType === 'summary' && reportData.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Total Orders</p>
                            <p className="text-2xl font-bold">{reportData.summary.totalOrders}</p>
                          </div>
                          <Package className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Avg/Day</p>
                            <p className="text-2xl font-bold">{reportData.summary.averageOrdersPerDay}</p>
                          </div>
                          <Calendar className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Assigned</p>
                            <p className="text-2xl font-bold">{reportData.summary.assignmentDistribution.assigned || 0}</p>
                            <p className="text-xs text-slate-500">
                              of {reportData.summary.totalOrders} total
                            </p>
                          </div>
                          <Users className="w-8 h-8 text-purple-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Completion Report */}
                {reportType === 'completion' && reportData.completion && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Completion Rate</p>
                            <p className="text-2xl font-bold">{reportData.completion.completionRate}%</p>
                            <p className="text-xs text-slate-500">
                              {reportData.completion.totalCompleted} of {reportData.completion.totalOrders} orders
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Avg Completions</p>
                            <p className="text-2xl font-bold">{reportData.completion.averageCompletionsPerPeriod}</p>
                            <p className="text-xs text-slate-500">per {reportPeriod}</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Cycle Times Report */}
                {reportType === 'cycle-times' && reportData.cycleTimes && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Avg Cycle Time</p>
                            <p className="text-2xl font-bold">{reportData.cycleTimes.averageTotalCycleTime}</p>
                            <p className="text-xs text-slate-500">hours</p>
                          </div>
                          <Clock className="w-8 h-8 text-orange-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Orders Analyzed</p>
                            <p className="text-2xl font-bold">{reportData.cycleTimes.totalOrdersAnalyzed}</p>
                          </div>
                          <BarChart3 className="w-8 h-8 text-purple-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Fastest Order</p>
                            <p className="text-lg font-bold">
                              {reportData.cycleTimes.fastestOrder?.totalCycleTimeHours?.toFixed(1) || 'N/A'}h
                            </p>
                            <p className="text-xs text-slate-500">
                              {reportData.cycleTimes.fastestOrder?.poNumber || ''}
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Report Generation Info */}
                <div className="mt-4 p-3 bg-slate-50 rounded-md text-sm text-slate-600">
                  <p>
                    Report generated on {reportData.generatedAt ? format(new Date(reportData.generatedAt), "PPpp") : 'Unknown'} 
                    {reportData.generatedBy && ` by ${reportData.generatedBy.name}`}
                  </p>
                  <p>
                    Period: {format(new Date(reportData.dateRange.from), "PPP")} to {format(new Date(reportData.dateRange.to), "PPP")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Select report type and period, then click generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content - Conditional View */}
      {currentView === 'calendar' ? (
        <ProductionScheduleCalendar />
      ) : currentView === 'service-requests' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Service Requests</CardTitle>
                <CardDescription>
                  Service part requests assigned to production team
                </CardDescription>
              </div>
              <Button 
                onClick={fetchServiceRequests} 
                size="sm" 
                variant="outline"
                disabled={serviceRequestsLoading}
              >
                {serviceRequestsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {serviceRequestsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : serviceRequests.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No service requests assigned to production</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Order ID</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceRequests.map((serviceOrder) => (
                    <TableRow key={serviceOrder.id}>
                      <TableCell className="font-medium">#{serviceOrder.id.slice(-8)}</TableCell>
                      <TableCell>{serviceOrder.requestedBy?.fullName || "Unknown"}</TableCell>
                      <TableCell>
                        {serviceOrder.requestTimestamp ? 
                          format(new Date(serviceOrder.requestTimestamp), "MMM dd, yyyy") 
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          serviceOrder.priority === "URGENT" 
                            ? "bg-red-100 text-red-700" 
                            : serviceOrder.priority === "HIGH"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }>
                          {serviceOrder.priority || "NORMAL"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {serviceOrder.items?.slice(0, 2).map((item: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{item.partName}</span>
                              <span className="text-slate-500 ml-2">(Qty: {item.quantity})</span>
                            </div>
                          ))}
                          {serviceOrder.items?.length > 2 && (
                            <p className="text-xs text-slate-500">
                              +{serviceOrder.items.length - 2} more items
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-slate-600">
                          {serviceOrder.notes || "No notes provided"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleCompleteServiceRequest(serviceOrder.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Complete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Orders Table */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                All orders relevant to production coordination
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {/* Toggle Advanced Search */}
              <Button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                variant="outline"
                size="sm"
              >
                <Search className="w-4 h-4 mr-2" />
                {showAdvancedSearch ? "Simple" : "Advanced"} Search
                {showAdvancedSearch ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>

              {/* Clear Filters */}
              {hasActiveFilters() && (
                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}

              {/* Bulk Actions Toggle */}
              <Button
                onClick={() => setShowBulkActions(!showBulkActions)}
                variant={showBulkActions ? "default" : "outline"}
                size="sm"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {showBulkActions ? "Exit" : "Select"} Mode
              </Button>

              {/* Refresh Button */}
              <Button 
                onClick={fetchOrders} 
                size="sm" 
                variant="outline"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Advanced Search Form */}
        <Collapsible open={showAdvancedSearch}>
          <CollapsibleContent>
            <div className="px-6 pb-4 border-b">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* PO Number Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">PO Number</label>
                  <Input
                    placeholder="Search PO Number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Customer Name Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Name</label>
                  <Input
                    placeholder="Search Customer..."
                    value={customerNameFilter}
                    onChange={(e) => setCustomerNameFilter(e.target.value)}
                  />
                </div>

                {/* Build Number Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Build Number</label>
                  <Input
                    placeholder="Search Build Number..."
                    value={buildNumberFilter}
                    onChange={(e) => setBuildNumberFilter(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value)
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      {PC_RELEVANT_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>
                          {statusDisplayNames[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Type Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Type</label>
                  <Select value={dateTypeFilter} onValueChange={setDateTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Order Date</SelectItem>
                      <SelectItem value="wantDate">Want Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <DatePicker
                    date={dateFromFilter}
                    onDateChange={setDateFromFilter}
                    placeholder="Select start date"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <DatePicker
                    date={dateToFilter}
                    onDateChange={setDateToFilter}
                    placeholder="Select end date"
                  />
                </div>

                {/* Active Filters Summary */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Active Filters</label>
                  <div className="flex items-center h-10 px-3 border rounded-md bg-slate-50 text-sm text-slate-600">
                    {hasActiveFilters() ? `${[searchTerm, customerNameFilter, buildNumberFilter].filter(Boolean).length + (statusFilter !== "ALL" ? 1 : 0) + (dateFromFilter || dateToFilter ? 1 : 0)} active` : "None"}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="px-6 py-3 border-b bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {selectedOrders.length} of {orders.length} orders selected
                </span>
                
                {selectedOrders.length > 0 && (
                  <div className="flex items-center space-x-2">
                    {/* Bulk Status Update */}
                    <Select onValueChange={handleBulkStatusUpdate}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {PC_RELEVANT_STATUSES.map(status => (
                          <SelectItem key={status} value={status}>
                            {statusDisplayNames[status]}
                          </SelectItem>
                        ))}
                        <SelectItem value="SHIPPED">Shipped</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Bulk Assignment */}
                    <Select onValueChange={(value) => handleBulkAssignment(value === 'unassign' ? null : value)}>
                      <SelectTrigger className="w-48">
                        <UserPlus className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Assign To" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassign">Remove Assignment</SelectItem>
                        {assignableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Export Selected */}
                    <Button
                      onClick={handleBulkExport}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {orders.length > 0 && (
                  <Button
                    onClick={toggleSelectAll}
                    variant="outline"
                    size="sm"
                  >
                    {selectedOrders.length === orders.length ? "Deselect All" : "Select All"}
                  </Button>
                )}

                <Button
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                >
                  Clear Selection
                </Button>
              </div>
            </div>

            {bulkActionLoading && (
              <div className="mt-2 flex items-center text-sm text-blue-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing bulk action...
              </div>
            )}
          </div>
        )}

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No orders found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {showBulkActions && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all orders"
                        />
                      </TableHead>
                    )}
                    <TableHead>PO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Want Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Build Numbers</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className={selectedOrders.includes(order.id) ? "bg-blue-50" : ""}>
                      {showBulkActions && (
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                            aria-label={`Select order ${order.poNumber}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{order.poNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.wantDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.orderStatus] || "bg-gray-100 text-gray-700"}>
                          {statusDisplayNames[order.orderStatus] || order.orderStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {order.buildNumbers.slice(0, 3).map((bn: string) => (
                            <Badge key={bn} variant="outline" className="text-xs">
                              {bn}
                            </Badge>
                          ))}
                          {order.buildNumbers.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{order.buildNumbers.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.currentAssignee ? (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1 text-green-500" />
                            <span className="text-sm">
                              {assignableUsers.find(u => u.id === order.currentAssignee)?.fullName || 
                               order.currentAssignee}
                            </span>
                          </div>
                        ) : shouldShowAssignmentOption(order.orderStatus) ? (
                          <span className="text-slate-500">Unassigned</span>
                        ) : (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-amber-500" />
                            <span className="text-xs text-slate-400">Pending assignment eligibility</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigateToOrder(order.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigateToOrder(order.id)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Update Status
                            </DropdownMenuItem>
                            {shouldShowAssignmentOption(order.orderStatus) && (
                              <DropdownMenuItem onClick={() => {
                                setAssignmentOrderId(order.id)
                                setAssignmentDialogOpen(true)
                              }}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Assign To
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleViewDocuments(order.id)}>
                              <FolderOpen className="w-4 h-4 mr-2" />
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}/print`)}>
                              <Printer className="w-4 h-4 mr-2" />
                              Print Summary
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="w-4 h-4 mr-2" />
                              Export BOM
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-600">
                  Showing {((currentPage - 1) * ordersPerPage) + 1} to{" "}
                  {Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Order</DialogTitle>
            <DialogDescription>
              Select a user to assign this order to, or remove the current assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {assignmentOrderId && (
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="text-sm font-medium">
                  Order: {orders.find(o => o.id === assignmentOrderId)?.poNumber}
                </p>
                <div className="text-sm text-slate-600">
                  Status: <Badge variant="outline" className="ml-1">
                    {orders.find(o => o.id === assignmentOrderId)?.orderStatus?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Current: {orders.find(o => o.id === assignmentOrderId)?.currentAssignee 
                    ? assignableUsers.find(u => u.id === orders.find(o => o.id === assignmentOrderId)?.currentAssignee)?.fullName || 'Unknown'
                    : 'Unassigned'}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign To:</label>
              <Select 
                onValueChange={(value) => {
                  if (assignmentOrderId) {
                    handleSingleAssignment(assignmentOrderId, value === 'unassign' ? null : value)
                    setAssignmentDialogOpen(false)
                    setAssignmentOrderId(null)
                  }
                }}
                disabled={assignmentLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user or remove assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Remove Assignment</SelectItem>
                  {assignableUsers.map(user => {
                    const currentOrder = orders.find(o => o.id === assignmentOrderId)
                    const validation = currentOrder ? canAssignOrder(currentOrder.orderStatus, user.role) : { canAssign: true }
                    
                    return (
                      <SelectItem 
                        key={user.id} 
                        value={user.id}
                        disabled={!validation.canAssign}
                        className={!validation.canAssign ? "opacity-50" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span>{user.fullName}</span>
                            {!validation.canAssign && (
                              <span className="text-xs text-red-500 mt-1">
                                Cannot assign to {currentOrder?.orderStatus}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center ml-2">
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                            {validation.canAssign && (
                              <CheckCircle className="w-3 h-3 text-green-500 ml-1" />
                            )}
                            {!validation.canAssign && (
                              <AlertCircle className="w-3 h-3 text-red-500 ml-1" />
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {assignmentLoading && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Updating assignment...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}

      {/* Document Preview Modal */}
      <DocumentPreview
        file={previewDocument}
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        downloadUrl={previewDocument?.id ? `/uploads/documents/${previewDocument.filename}` : undefined}
        onDownload={() => {
          if (previewDocument) {
            const downloadUrl = `/uploads/documents/${previewDocument.filename}`
            window.open(downloadUrl, '_blank')
          }
        }}
      />
    </div>
  )
}