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
import { BOMViewerWithOutsourcing } from "@/components/order/BOMViewerWithOutsourcing"
import { OutsourcingDialog } from "@/components/procurement/OutsourcingDialog"
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

export function ProcurementSpecialistDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [serviceOrders, setServiceOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceLoading, setServiceLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [bomData, setBomData] = useState<any>(null)
  const [bomLoading, setBomLoading] = useState(false)
  const [showBomDialog, setShowBomDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("orders")
  const [stats, setStats] = useState({
    newOrders: 0,
    awaitingParts: 0,
    urgentOrders: 0
  })
  const [serviceStats, setServiceStats] = useState({
    pendingRequests: 0,
    urgentRequests: 0
  })
  
  // Outsourcing state
  const [outsourcedParts, setOutsourcedParts] = useState<any[]>([])
  const [outsourcingStats, setOutsourcingStats] = useState<any>(null)
  const [outsourcingLoading, setOutsourcingLoading] = useState(false)
  const [selectedOutsourcedParts, setSelectedOutsourcedParts] = useState<Set<string>>(new Set())
  const [outsourcingFilter, setOutsourcingFilter] = useState({
    status: "all",
    supplier: "all"
  })
  const [showOutsourcingDialog, setShowOutsourcingDialog] = useState(false)
  const [editingOutsourcedPart, setEditingOutsourcedPart] = useState<any>(null)

  useEffect(() => {
    fetchOrders()
    fetchServiceOrders()
    fetchOutsourcedParts()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Fetch orders relevant to procurement
      const response = await nextJsApiClient.get("/orders?limit=50")
      
      if (response.data.success) {
        // Filter for procurement-relevant statuses (Sprint 4.1 requirement)
        const procurementOrders = response.data.data.filter((order: any) => 
          ["OrderCreated", "PartsSent"].includes(order.orderStatus)
        )
        
        setOrders(procurementOrders)
        calculateStats(procurementOrders)
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
      newOrders: 0,
      awaitingParts: 0,
      urgentOrders: 0
    }

    const today = new Date()
    ordersList.forEach(order => {
      if (order.orderStatus === "OrderCreated") {
        stats.newOrders++
      }
      if (order.orderStatus === "PartsSent") {
        stats.awaitingParts++
      }
      
      // Check if order is urgent (want date within 14 days)
      const wantDate = new Date(order.wantDate)
      const daysUntilDue = Math.ceil((wantDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilDue <= 14) {
        stats.urgentOrders++
      }
    })

    setStats(stats)
  }

  const fetchBOM = async (order: any) => {
    setBomLoading(true)
    try {
      const response = await nextJsApiClient.post("/orders/preview-bom", {
        sinkModel: order.configurations?.[order.buildNumbers[0]]?.sinkModelId || "MDRD_B2_ESINK",
        quantity: order.buildNumbers?.length || 1,
        configurations: order.configurations || {},
        accessories: order.accessories || {}
      })
      
      if (response.data.success) {
        setBomData(response.data.data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load BOM data",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error("Error fetching BOM:", error)
      toast({
        title: "Error",
        description: "Failed to load BOM data",
        variant: "destructive"
      })
    } finally {
      setBomLoading(false)
    }
  }

  const handleViewBOM = async (order: any) => {
    setSelectedOrder(order)
    setShowBomDialog(true)
    await fetchBOM(order)
  }

  const navigateToOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const handleApproveBOMForProduction = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "PartsSent",
        notes: "BOM approved for production by procurement specialist"
      })
      
      if (response.data.success) {
        toast({
          title: "BOM Approved",
          description: "BOM approved for production and parts procurement initiated"
        })
        setShowBomDialog(false)
        fetchOrders() // Refresh the list
      }
    } catch (error: any) {
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
        newStatus: "ReadyForPreQC",
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

  const fetchServiceOrders = async () => {
    setServiceLoading(true)
    try {
      const response = await nextJsApiClient.get("/service-orders?limit=50")
      
      if (response.data.success) {
        // Filter for pending service orders
        const pendingServiceOrders = response.data.data.filter((serviceOrder: any) => 
          serviceOrder.status === "PENDING"
        )
        
        setServiceOrders(pendingServiceOrders)
        calculateServiceStats(pendingServiceOrders)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch service orders",
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

  const handleApproveServiceOrder = async (serviceOrderId: string) => {
    setActionLoading(serviceOrderId)
    try {
      const response = await nextJsApiClient.post(`/api/v1/service/orders/${serviceOrderId}/approve`)
      
      if (response.data.success) {
        toast({
          title: "Service Order Approved",
          description: "Service order has been approved and fulfilled"
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

  const fetchOutsourcedParts = async () => {
    setOutsourcingLoading(true)
    try {
      const params = new URLSearchParams()
      if (outsourcingFilter.status !== "all") {
        params.append("status", outsourcingFilter.status)
      }
      if (outsourcingFilter.supplier !== "all") {
        params.append("supplier", outsourcingFilter.supplier)
      }
      
      const response = await nextJsApiClient.get(`/procurement/outsourced-parts?${params.toString()}`)
      
      if (response.data.success) {
        setOutsourcedParts(response.data.data)
        setOutsourcingStats(response.data.stats)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch outsourced parts",
        variant: "destructive"
      })
    } finally {
      setOutsourcingLoading(false)
    }
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedOutsourcedParts.size === 0) {
      toast({
        title: "No parts selected",
        description: "Please select parts to update",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await nextJsApiClient.post("/procurement/outsourced-parts", {
        ids: Array.from(selectedOutsourcedParts),
        status: status
      })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: response.data.message
        })
        setSelectedOutsourcedParts(new Set())
        fetchOutsourcedParts()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update parts",
        variant: "destructive"
      })
    }
  }

  const handleExportOutsourcedParts = async () => {
    try {
      const response = await nextJsApiClient.put("/procurement/outsourced-parts?format=csv", null, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `outsourced-parts-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast({
        title: "Export Successful",
        description: "Outsourced parts list exported as CSV"
      })
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: "Failed to export outsourced parts",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Procurement Dashboard</h2>
        <p className="text-slate-600">Manage parts ordering and track procurement status</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              New Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.newOrders}</span>
              <ShoppingCart className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Requiring parts procurement</p>
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
              <TruckIcon className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Parts sent, waiting arrival</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Urgent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.urgentOrders}</span>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Due within 14 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Service Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{serviceStats.pendingRequests}</span>
              <Package className="w-8 h-8 text-green-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Urgent Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{serviceStats.urgentRequests}</span>
              <Send className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">High priority requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Production Orders</TabsTrigger>
          <TabsTrigger value="service">Service Requests</TabsTrigger>
          <TabsTrigger value="outsourcing">Outsourcing Management</TabsTrigger>
        </TabsList>
        
        {/* Production Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders Requiring Procurement</CardTitle>
              <CardDescription>
                Orders that need parts ordering or are awaiting parts arrival
              </CardDescription>
            </CardHeader>
            <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No orders requiring procurement action</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Want Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Until Due</TableHead>
                  <TableHead>Key Components</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const wantDate = new Date(order.wantDate)
                  const today = new Date()
                  const daysUntilDue = Math.ceil((wantDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgent = daysUntilDue <= 14

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.poNumber}</TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(wantDate, "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          order.orderStatus === "OrderCreated" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-purple-100 text-purple-700"
                        }>
                          {order.orderStatus === "OrderCreated" ? "New Order" : "Parts Sent"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isUrgent ? "text-red-600 font-medium" : ""}>
                          {daysUntilDue} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="link" size="sm" onClick={() => handleViewBOM(order)}>
                          View BOM
                        </Button>
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
                            <DropdownMenuItem onClick={() => handleViewBOM(order)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View BOM & Approve
                            </DropdownMenuItem>
                            {order.orderStatus === "OrderCreated" && (
                              <DropdownMenuItem 
                                onClick={() => handleApproveBOMForProduction(order.id)}
                                disabled={actionLoading === order.id}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve BOM for Production
                              </DropdownMenuItem>
                            )}
                            {order.orderStatus === "PartsSent" && (
                              <DropdownMenuItem 
                                onClick={() => handleConfirmPartsArrival(order.id)}
                                disabled={actionLoading === order.id}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                Confirm Parts Arrival
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
        
        {/* Service Requests Tab */}
        <TabsContent value="service" className="space-y-6">
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
                          {format(new Date(serviceOrder.createdAt), "MMM dd, yyyy")}
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
                          {serviceOrder.serviceOrderItems?.length || 0} items
                        </TableCell>
                        <TableCell>
                          ${serviceOrder.estimatedCost?.toFixed(2) || "TBD"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveServiceOrder(serviceOrder.id)}
                              disabled={actionLoading === serviceOrder.id}
                            >
                              {actionLoading === serviceOrder.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve & Fulfill
                                </>
                              )}
                            </Button>
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
        
        {/* Outsourcing Management Tab */}
        <TabsContent value="outsourcing" className="space-y-6">
          {/* Outsourcing Statistics */}
          {outsourcingStats && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{outsourcingStats.total}</span>
                    <Package className="w-8 h-8 text-blue-500 opacity-20" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Total Outsourced</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{outsourcingStats.pending}</span>
                    <Clock className="w-8 h-8 text-yellow-500 opacity-20" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Pending</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{outsourcingStats.sent}</span>
                    <Send className="w-8 h-8 text-blue-500 opacity-20" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Sent</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{outsourcingStats.inProgress}</span>
                    <TruckIcon className="w-8 h-8 text-purple-500 opacity-20" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">In Progress</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{outsourcingStats.received}</span>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Received</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{outsourcingStats.overdueCount}</span>
                    <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Overdue</p>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Outsourced Parts Management</CardTitle>
                  <CardDescription>
                    Track and manage parts sent to external suppliers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fetchOutsourcedParts()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportOutsourcedParts}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select
                  value={outsourcingFilter.status}
                  onValueChange={(value) => {
                    setOutsourcingFilter(prev => ({ ...prev, status: value }))
                    setTimeout(fetchOutsourcedParts, 100)
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                {selectedOutsourcedParts.size > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-sm text-muted-foreground">
                      {selectedOutsourcedParts.size} selected
                    </span>
                    <Button size="sm" onClick={() => handleBulkStatusUpdate("SENT")}>
                      Mark as Sent
                    </Button>
                    <Button size="sm" onClick={() => handleBulkStatusUpdate("RECEIVED")}>
                      Mark as Received
                    </Button>
                  </div>
                )}
              </div>
              
              {outsourcingLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : outsourcedParts.length === 0 ? (
                <div className="text-center py-12">
                  <ExternalLink className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No outsourced parts found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOutsourcedParts.size === outsourcedParts.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOutsourcedParts(new Set(outsourcedParts.map(p => p.id)))
                            } else {
                              setSelectedOutsourcedParts(new Set())
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outsourcedParts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOutsourcedParts.has(part.id)}
                            onCheckedChange={(checked) => {
                              const newSelection = new Set(selectedOutsourcedParts)
                              if (checked) {
                                newSelection.add(part.id)
                              } else {
                                newSelection.delete(part.id)
                              }
                              setSelectedOutsourcedParts(newSelection)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{part.partNumber}</span>
                            <p className="text-sm text-muted-foreground">{part.partName}</p>
                          </div>
                        </TableCell>
                        <TableCell>{part.order?.poNumber}</TableCell>
                        <TableCell>{part.order?.customerName}</TableCell>
                        <TableCell>{part.supplier || "Not specified"}</TableCell>
                        <TableCell>
                          <Badge className={
                            part.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                            part.status === "SENT" ? "bg-blue-100 text-blue-700" :
                            part.status === "IN_PROGRESS" ? "bg-purple-100 text-purple-700" :
                            part.status === "RECEIVED" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {part.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {part.expectedReturnDate 
                            ? format(new Date(part.expectedReturnDate), "MMM dd, yyyy")
                            : "Not set"
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingOutsourcedPart(part)
                              setShowOutsourcingDialog(true)
                            }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BOM Approval Dialog */}
      <Dialog open={showBomDialog} onOpenChange={setShowBomDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              BOM Review & Approval - PO: {selectedOrder?.poNumber}
            </DialogTitle>
            <DialogDescription>
              Review the Bill of Materials for this order and approve for production
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrder && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Customer:</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Want Date:</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedOrder.wantDate), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Order Date:</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedOrder.createdAt), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Build Quantity:</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.buildNumbers?.length || 1}</p>
                </div>
              </div>
            )}
            
            {bomLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading BOM data...</span>
              </div>
            ) : bomData ? (
              <BOMViewerWithOutsourcing 
                orderId={selectedOrder.id}
                poNumber={selectedOrder.poNumber}
                bomData={bomData}
                allowOutsourcing={true}
              />
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No BOM data available</p>
              </div>
            )}
            
            {selectedOrder?.orderStatus === "OrderCreated" && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Ready to approve this BOM for production?
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBomDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleApproveBOMForProduction(selectedOrder.id)}
                    disabled={actionLoading === selectedOrder.id}
                  >
                    {actionLoading === selectedOrder.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve BOM for Production
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Outsourcing Dialog */}
      <OutsourcingDialog
        open={showOutsourcingDialog}
        onOpenChange={setShowOutsourcingDialog}
        part={editingOutsourcedPart}
        mode="edit"
        onSave={async (data) => {
          try {
            const response = await nextJsApiClient.put(
              `/orders/${editingOutsourcedPart?.order?.id}/outsourced-parts?id=${data.id}`,
              data
            )
            if (response.data.success) {
              toast({
                title: "Success",
                description: "Outsourcing details updated",
              })
              setShowOutsourcingDialog(false)
              fetchOutsourcedParts()
            }
          } catch (error: any) {
            toast({
              title: "Error",
              description: error.response?.data?.error || "Failed to update outsourcing details",
              variant: "destructive",
            })
          }
        }}
        loading={false}
      />
    </div>
  )
}