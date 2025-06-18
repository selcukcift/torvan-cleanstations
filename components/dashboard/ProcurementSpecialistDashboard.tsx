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
import { SimpleBOMApproval } from "@/components/procurement/SimpleBOMApproval"
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


export function ProcurementSpecialistDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [serviceOrders, setServiceOrders] = useState<any[]>([])
  const [serviceLoading, setServiceLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("orders")
  const [serviceStats, setServiceStats] = useState({
    pendingRequests: 0,
    urgentRequests: 0
  })

  useEffect(() => {
    fetchServiceOrders()
  }, [])

  // Placeholder function for backward compatibility
  const fetchOrders = () => {
    // This is now handled by SimpleBOMApproval component
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





  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Procurement Dashboard</h2>
          <p className="text-gray-600">
            Manage CleanStation BOM approvals and service requests
          </p>
          {serviceStats.pendingRequests > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Package className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                {serviceStats.pendingRequests} pending service requests
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">CleanStation Production BOMs</TabsTrigger>
          <TabsTrigger value="service">Service Part Requests</TabsTrigger>
        </TabsList>
        
        {/* BOM Approvals Tab */}
        <TabsContent value="orders" className="space-y-4">
          <SimpleBOMApproval onOrderUpdate={fetchOrders} />
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

        
      </Tabs>


    </div>
  )
}