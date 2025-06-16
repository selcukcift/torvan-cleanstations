"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Package,
  Clock,
  AlertCircle,
  Eye,
  FileText,
  MoreHorizontal,
  ShoppingCart,
  Loader2,
  TruckIcon,
  CheckCircle,
  Send
} from "lucide-react"
import { format } from "date-fns"
import { BOMViewer } from "@/components/order/BOMViewer"
import { ExpandableProcurementRow } from "@/components/procurement/ExpandableProcurementRow"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ExternalLink, Download, Filter, RefreshCw } from "lucide-react"
import { ServiceOrderApproval } from "@/components/service/ServiceOrderApproval"

// Status badge color mapping
const statusColors: Record<string, string> = {
  ORDER_CREATED: "bg-blue-100 text-blue-700",
  PARTS_SENT_WAITING_ARRIVAL: "bg-purple-100 text-purple-700",
  READY_FOR_PRE_QC: "bg-yellow-100 text-yellow-700",
  READY_FOR_PRODUCTION: "bg-orange-100 text-orange-700",
  TESTING_COMPLETE: "bg-green-100 text-green-700",
  PACKAGING_COMPLETE: "bg-teal-100 text-teal-700",
  READY_FOR_FINAL_QC: "bg-indigo-100 text-indigo-700",
  READY_FOR_SHIP: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-gray-100 text-gray-700"
}

// Status display names
const statusDisplayNames: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  PARTS_SENT_WAITING_ARRIVAL: "Parts Sent",
  READY_FOR_PRE_QC: "Pre-QC",
  READY_FOR_PRODUCTION: "Production",
  TESTING_COMPLETE: "Testing",
  PACKAGING_COMPLETE: "Packaging",
  READY_FOR_FINAL_QC: "Final QC",
  READY_FOR_SHIP: "Ready Ship",
  SHIPPED: "Shipped"
}

// OrderCard Component
interface OrderCardProps {
  order: any
  variant: 'new' | 'progress' | 'shipped'
  onApprove?: (orderId: string) => void
  onView: (orderId: string) => void
  isLoading?: boolean
}

function OrderCard({ order, variant, onApprove, onView, isLoading }: OrderCardProps) {
  const wantDate = order.wantDate ? new Date(order.wantDate) : null
  const today = new Date()
  const daysUntilDue = wantDate ? Math.ceil((wantDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0
  const isUrgent = daysUntilDue !== null && daysUntilDue <= 14 && daysUntilDue >= 0

  const cardHeight = variant === 'shipped' ? 'h-14' : 'h-18'
  const borderColor = variant === 'new' ? 'border-l-blue-500' : 
                     variant === 'progress' ? 'border-l-purple-500' : 'border-l-gray-400'

  return (
    <Card className={`${cardHeight} border-l-4 ${borderColor} hover:shadow-md transition-shadow cursor-pointer`}>
      <CardContent className="p-2 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-sm truncate">{order.poNumber}</span>
              {variant === 'new' && isUrgent && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0">
                  URGENT
                </Badge>
              )}
              {variant === 'progress' && (
                <Badge className={`${statusColors[order.orderStatus] || "bg-gray-100 text-gray-700"} text-xs px-1 py-0`}>
                  {statusDisplayNames[order.orderStatus] || order.orderStatus}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 truncate">{order.customerName || "N/A"}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-xs">
            {variant === 'shipped' ? (
              <span className="text-slate-500">
                📦 {order.updatedAt ? format(new Date(order.updatedAt), "MMM dd") : "N/A"}
              </span>
            ) : (
              <>
                <span className="text-slate-500">
                  📅 {wantDate ? format(wantDate, "MMM dd") : "N/A"}
                </span>
                {daysUntilDue !== null && (
                  <span className={`ml-1 ${isOverdue ? "text-red-600 font-medium" : isUrgent ? "text-orange-600 font-medium" : "text-slate-500"}`}>
                    {isOverdue ? `${Math.abs(daysUntilDue)}d over` : `${daysUntilDue}d`}
                  </span>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {variant === 'new' && onApprove && (
              <Button 
                size="sm" 
                className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove(order.id)
                }}
                disabled={isLoading}
              >
                ✓
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onView(order.id)
              }}
            >
              👁
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProcurementSpecialistDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [newOrders, setNewOrders] = useState<any[]>([])
  const [inProgressOrders, setInProgressOrders] = useState<any[]>([])
  const [completedOrders, setCompletedOrders] = useState<any[]>([])
  const [serviceOrders, setServiceOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceLoading, setServiceLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("orders")
  const [stats, setStats] = useState({
    newOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    urgentOrders: 0,
    overdueOrders: 0
  })
  const [orderFilters, setOrderFilters] = useState({
    customer: "",
    searchTerm: ""
  })
  const [selectedNewOrders, setSelectedNewOrders] = useState<Set<string>>(new Set())
  const [selectedInProgressOrders, setSelectedInProgressOrders] = useState<Set<string>>(new Set())
  const [serviceStats, setServiceStats] = useState({
    pendingRequests: 0,
    urgentRequests: 0
  })
  
  
  // Procurement parts selection state
  const [selectedProcurementParts, setSelectedProcurementParts] = useState<Set<string>>(new Set())
  const [bulkSending, setBulkSending] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchServiceOrders()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [orderFilters])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Fetch orders relevant to procurement
      const response = await nextJsApiClient.get("/orders?limit=50")
      
      console.log("🔍 [Procurement Debug] Raw API response:", response.data)
      
      if (response.data.success) {
        // Log all orders first
        console.log("📋 [Procurement Debug] All orders from API:", response.data.data?.map((o: any) => ({
          id: o.id.slice(-8),
          poNumber: o.poNumber,
          status: o.orderStatus,
          customer: o.customerName
        })))
        
        // Procurement can see ALL orders - they need to track orders through entire lifecycle
        let allProcurementOrders = response.data.data
        
        console.log("✅ [Procurement Debug] Filtered procurement orders:", allProcurementOrders?.map((o: any) => ({
          id: o.id.slice(-8),
          poNumber: o.poNumber,
          status: o.orderStatus,
          customer: o.customerName
        })))
        
        // Apply customer and search filters to all orders
        if (orderFilters.customer) {
          allProcurementOrders = allProcurementOrders.filter((order: any) => 
            order.customerName?.toLowerCase().includes(orderFilters.customer.toLowerCase())
          )
        }
        
        if (orderFilters.searchTerm) {
          allProcurementOrders = allProcurementOrders.filter((order: any) => 
            order.poNumber?.toLowerCase().includes(orderFilters.searchTerm.toLowerCase()) ||
            order.customerName?.toLowerCase().includes(orderFilters.searchTerm.toLowerCase())
          )
        }
        
        // Separate orders by workflow stage
        const newOrdersList = allProcurementOrders.filter((order: any) => 
          order.orderStatus === "ORDER_CREATED"
        )
        
        const inProgressOrdersList = allProcurementOrders.filter((order: any) => 
          ["PARTS_SENT_WAITING_ARRIVAL", "READY_FOR_PRE_QC", "READY_FOR_PRODUCTION", 
           "TESTING_COMPLETE", "PACKAGING_COMPLETE", "READY_FOR_FINAL_QC", "READY_FOR_SHIP"].includes(order.orderStatus)
        )
        
        const completedOrdersList = allProcurementOrders.filter((order: any) => 
          order.orderStatus === "SHIPPED"
        )
        
        console.log("🆕 [Procurement Debug] New orders (ORDER_CREATED):", newOrdersList?.map((o: any) => ({
          id: o.id.slice(-8),
          poNumber: o.poNumber,
          status: o.orderStatus
        })))
        
        console.log("🚛 [Procurement Debug] In progress orders:", inProgressOrdersList?.map((o: any) => ({
          id: o.id.slice(-8),
          poNumber: o.poNumber,
          status: o.orderStatus
        })))
        
        console.log("✅ [Procurement Debug] Completed orders (SHIPPED):", completedOrdersList?.map((o: any) => ({
          id: o.id.slice(-8),
          poNumber: o.poNumber,
          status: o.orderStatus
        })))
        
        setNewOrders(newOrdersList)
        setInProgressOrders(inProgressOrdersList)
        setCompletedOrders(completedOrdersList)
        calculateStats(allProcurementOrders)
      }
    } catch (error: any) {
      console.error("❌ [Procurement Debug] API Error:", error)
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
      newOrders: 0,
      inProgressOrders: 0,
      completedOrders: 0,
      urgentOrders: 0,
      overdueOrders: 0
    }

    const today = new Date()
    ordersList.forEach(order => {
      if (order.orderStatus === "ORDER_CREATED") {
        stats.newOrders++
      }
      if (["PARTS_SENT_WAITING_ARRIVAL", "READY_FOR_PRE_QC", "READY_FOR_PRODUCTION", 
           "TESTING_COMPLETE", "PACKAGING_COMPLETE", "READY_FOR_FINAL_QC", "READY_FOR_SHIP"].includes(order.orderStatus)) {
        stats.inProgressOrders++
      }
      if (order.orderStatus === "SHIPPED") {
        stats.completedOrders++
      }
      
      // Check if order is urgent (want date within 14 days)
      if (order.wantDate) {
        const wantDate = new Date(order.wantDate)
        const daysUntilDue = Math.ceil((wantDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilDue <= 14 && order.orderStatus !== "SHIPPED") {
          stats.urgentOrders++
        }
        
        // Check if order is overdue (past want date and not shipped)
        if (daysUntilDue < 0 && order.orderStatus !== "SHIPPED") {
          stats.overdueOrders++
        }
      }
    })

    setStats(stats)
  }


  const navigateToOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const handleApproveBOMForProduction = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      console.log("🔄 [Procurement Debug] Approving order:", orderId, "changing status to PARTS_SENT_WAITING_ARRIVAL")
      
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "PARTS_SENT_WAITING_ARRIVAL",
        notes: "BOM approved for production by procurement specialist"
      })
      
      console.log("✅ [Procurement Debug] Status update response:", response.data)
      
      if (response.data.success) {
        toast({
          title: "BOM Approved",
          description: "BOM approved for production and parts procurement initiated"
        })
        
        console.log("🔄 [Procurement Debug] Fetching orders after approval...")
        
        // Immediately move the order optimistically, then refresh to confirm
        const optimisticUpdate = () => {
          setNewOrders(prev => prev.filter(order => order.id !== orderId))
          
          // Find the order that was just approved and move it to in-progress
          const approvedOrder = newOrders.find(order => order.id === orderId)
          if (approvedOrder) {
            const updatedOrder = { 
              ...approvedOrder, 
              orderStatus: "PARTS_SENT_WAITING_ARRIVAL" 
            }
            setInProgressOrders(prev => [updatedOrder, ...prev])
            console.log("✨ [Procurement Debug] Optimistically moved order to in-progress section")
          }
        }
        
        // Apply optimistic update immediately
        optimisticUpdate()
        
        // Refresh from server to ensure accuracy
        setTimeout(() => {
          console.log("🔄 [Procurement Debug] Fetching orders after approval for verification...")
          fetchOrders() // Refresh the list
        }, 1000)
      }
    } catch (error: any) {
      console.error("❌ [Procurement Debug] Status update error:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve BOM",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmPartsArrival = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "READY_FOR_PRE_QC",
        notes: "Parts arrival confirmed by procurement specialist"
      })
      
      if (response.data.success) {
        toast({
          title: "Parts Confirmed",
          description: "Parts arrival confirmed - order ready for Pre-QC"
        })
        fetchOrders() // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to confirm parts arrival",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedNewOrders.size === 0) {
      toast({
        title: "No orders selected",
        description: "Please select orders to approve",
        variant: "destructive"
      })
      return
    }

    setActionLoading("bulk-approve")
    try {
      const approvalPromises = Array.from(selectedNewOrders).map(orderId =>
        nextJsApiClient.put(`/orders/${orderId}/status`, {
          newStatus: "PARTS_SENT_WAITING_ARRIVAL",
          notes: "Bulk BOM approval by procurement specialist"
        })
      )

      await Promise.all(approvalPromises)

      toast({
        title: "Bulk Approval Complete",
        description: `${selectedNewOrders.size} orders approved for production`
      })
      
      setSelectedNewOrders(new Set())
      fetchOrders()
    } catch (error: any) {
      toast({
        title: "Bulk Approval Failed",
        description: "Some orders could not be approved",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const fetchServiceOrders = async () => {
    setServiceLoading(true)
    try {
      const response = await nextJsApiClient.get("/service-orders?limit=50")
      
      if (response.data.success) {
        // Get service orders from correct response structure
        const serviceOrdersData = response.data.data.serviceOrders || []
        
        // Filter for pending service orders (PENDING or PENDING_APPROVAL)
        const pendingServiceOrders = serviceOrdersData.filter((serviceOrder: any) => 
          serviceOrder.status === "PENDING" || serviceOrder.status === "PENDING_APPROVAL"
        )
        
        setServiceOrders(pendingServiceOrders)
        calculateServiceStats(pendingServiceOrders)
      }
    } catch (error: any) {
      console.error("Service orders fetch error:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch service orders",
        variant: "destructive"
      })
    } finally {
      setServiceLoading(false)
    }
  }

  const calculateServiceStats = (serviceOrdersList: any[]) => {
    const stats = {
      pendingRequests: serviceOrdersList.length,
      urgentRequests: serviceOrdersList.filter(order => order.priority === "HIGH" || order.priority === "URGENT").length
    }
    setServiceStats(stats)
  }

  const handleApproveServiceOrderDirect = async (serviceOrderId: string) => {
    setActionLoading(serviceOrderId)
    try {
      const response = await nextJsApiClient.put(`/service-orders/${serviceOrderId}`, {
        status: "APPROVED",
        fulfillmentMethod: "PROCUREMENT_DIRECT",
        notes: "Approved and fulfilled directly by procurement specialist"
      })
      
      if (response.data.success) {
        toast({
          title: "Service Order Fulfilled",
          description: "Service order has been approved and fulfilled directly by procurement"
        })
        fetchServiceOrders() // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve service order",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendToProduction = async (serviceOrderId: string) => {
    setActionLoading(serviceOrderId)
    try {
      const response = await nextJsApiClient.put(`/service-orders/${serviceOrderId}`, {
        status: "APPROVED",
        fulfillmentMethod: "PRODUCTION_TEAM",
        notes: "Approved and assigned to production team for fulfillment"
      })
      
      if (response.data.success) {
        toast({
          title: "Sent to Production",
          description: "Service order has been approved and sent to production team"
        })
        fetchServiceOrders() // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send to production",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectServiceOrder = async (serviceOrderId: string) => {
    setActionLoading(serviceOrderId)
    try {
      const response = await nextJsApiClient.put(`/service-orders/${serviceOrderId}`, {
        status: "REJECTED",
        notes: "Rejected by procurement specialist"
      })
      
      if (response.data.success) {
        toast({
          title: "Service Order Rejected",
          description: "Service order has been rejected"
        })
        fetchServiceOrders() // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.response?.data?.message || "Failed to reject service order",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }




  // Procurement parts selection handlers
  const handleProcurementPartSelection = (partId: string, orderId: string) => {
    const newSelection = new Set(selectedProcurementParts)
    if (newSelection.has(partId)) {
      newSelection.delete(partId)
    } else {
      newSelection.add(partId)
    }
    setSelectedProcurementParts(newSelection)
  }

  const handleBulkSendParts = async () => {
    if (selectedProcurementParts.size === 0) {
      toast({
        title: "No parts selected",
        description: "Please select parts to send to manufacturer",
        variant: "destructive"
      })
      return
    }

    setBulkSending(true)
    try {
      let successCount = 0
      let errorCount = 0

      // Group selected parts by order
      const partsByOrder: Record<string, string[]> = {}
      selectedProcurementParts.forEach(partId => {
        const orderId = partId.split('-')[0] // Extract order ID from part ID
        if (!partsByOrder[orderId]) {
          partsByOrder[orderId] = []
        }
        partsByOrder[orderId].push(partId)
      })

      // Process each order
      for (const [orderId, partIds] of Object.entries(partsByOrder)) {
        try {
          // This will be handled by the ExpandableProcurementRow component
          // We'll trigger a refresh instead
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast({
          title: "Bulk Operation Complete",
          description: `Selected parts are being sent to manufacturer. Refresh to see updates.`
        })
        setSelectedProcurementParts(new Set())
        fetchOrders() // Refresh the orders list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process bulk parts sending",
        variant: "destructive"
      })
    } finally {
      setBulkSending(false)
    }
  }

  const handleSelectAllLegs = () => {
    // This would need to be implemented to select all legs across visible orders
    // For now, we'll show a message to expand orders first
    toast({
      title: "Expand Orders",
      description: "Please expand individual orders to select legs kits",
    })
  }

  const handleSelectAllCasters = () => {
    // This would need to be implemented to select all casters across visible orders
    // For now, we'll show a message to expand orders first
    toast({
      title: "Expand Orders",
      description: "Please expand individual orders to select casters",
    })
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Procurement Dashboard</h2>
          <div className="flex items-center gap-4 mt-1.5 text-sm">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium">{stats.newOrders}</span>
              <span className="text-slate-600">New</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="font-medium">{stats.inProgressOrders}</span>
              <span className="text-slate-600">In Progress</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="font-medium">{stats.completedOrders}</span>
              <span className="text-slate-600">Shipped</span>
            </span>
            {stats.overdueOrders > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="font-medium text-red-600">{stats.overdueOrders}</span>
                  <span className="text-red-600">Overdue</span>
                </span>
              </>
            )}
            {serviceStats.pendingRequests > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-green-500" />
                  <span className="font-medium text-green-600">{serviceStats.pendingRequests}</span>
                  <span className="text-green-600">Service Requests</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search PO# or Customer..."
            value={orderFilters.searchTerm}
            onChange={(e) => setOrderFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Production Orders</TabsTrigger>
          <TabsTrigger value="service">Service Requests</TabsTrigger>
          <TabsTrigger value="service-orders">Service Order Approvals</TabsTrigger>
        </TabsList>
        
        {/* Production Orders Tab */}
        <TabsContent value="orders" className="space-y-2">
          {/* Kanban Board Layout */}
          {/* Three Column Kanban Layout */}
          <div className="grid grid-cols-12 gap-3 h-[620px]">
            
            {/* Column 1: New Orders (30% width - 4 columns) */}
            <div className="col-span-4 bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="font-semibold text-blue-800">New Orders ({newOrders.length})</h3>
              </div>
              <div className="space-y-2 overflow-y-auto h-[565px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : newOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No new orders</p>
                  </div>
                ) : (
                  newOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      variant="new"
                      onApprove={handleApproveBOMForProduction}
                      onView={navigateToOrder}
                      isLoading={actionLoading === order.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: In Progress Orders (50% width - 6 columns) */}
            <div className="col-span-6 bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <h3 className="font-semibold text-purple-800">In Progress ({inProgressOrders.length})</h3>
              </div>
              <div className="space-y-2 overflow-y-auto h-[565px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : inProgressOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <TruckIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No orders in progress</p>
                  </div>
                ) : (
                  inProgressOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      variant="progress"
                      onView={navigateToOrder}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Shipped Orders (20% width - 2 columns) */}
            <div className="col-span-2 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-800">Shipped ({completedOrders.length})</h3>
              </div>
              <div className="space-y-2 overflow-y-auto h-[565px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : completedOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No shipped orders</p>
                  </div>
                ) : (
                  completedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      variant="shipped"
                      onView={navigateToOrder}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Service Requests Tab */}
        <TabsContent value="service" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Part Requests</CardTitle>
              <CardDescription>
                Pending service orders requiring procurement approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serviceLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : serviceOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No pending service requests</p>
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
                      <TableHead>Estimated Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceOrders.map((serviceOrder) => (
                      <TableRow key={serviceOrder.id}>
                        <TableCell className="font-medium">{serviceOrder.id.slice(-8)}</TableCell>
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
                            {serviceOrder.priority || "MEDIUM"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {serviceOrder.items?.length || 0} items
                        </TableCell>
                        <TableCell>
                          ${serviceOrder.estimatedCost?.toFixed(2) || "TBD"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  disabled={actionLoading === serviceOrder.id}
                                >
                                  {actionLoading === serviceOrder.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                  )}
                                  Approve
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleApproveServiceOrderDirect(serviceOrder.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Fulfill Directly
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleSendToProduction(serviceOrder.id)}
                                >
                                  <TruckIcon className="w-4 h-4 mr-2" />
                                  Send to Production
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectServiceOrder(serviceOrder.id)}
                              disabled={actionLoading === serviceOrder.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Orders Tab */}
        <TabsContent value="service-orders" className="space-y-4">
          <ServiceOrderApproval />
        </TabsContent>
        
      </Tabs>


    </div>
  )
}