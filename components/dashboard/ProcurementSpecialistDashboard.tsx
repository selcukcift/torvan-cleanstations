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
  TruckIcon
} from "lucide-react"
import { format } from "date-fns"

export function ProcurementSpecialistDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    newOrders: 0,
    awaitingParts: 0,
    urgentOrders: 0
  })

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Fetch orders relevant to procurement
      const response = await nextJsApiClient.get("/orders?limit=50")
      
      if (response.data.success) {
        // Filter for procurement-relevant statuses
        const procurementOrders = response.data.data.filter((order: any) => 
          ["ORDER_CREATED", "PARTS_SENT_WAITING_ARRIVAL"].includes(order.orderStatus)
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
      if (order.orderStatus === "ORDER_CREATED") {
        stats.newOrders++
      }
      if (order.orderStatus === "PARTS_SENT_WAITING_ARRIVAL") {
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

  const navigateToOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus,
        notes: "Parts procurement status updated"
      })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Order status updated successfully"
        })
        fetchOrders() // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Orders Table */}
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
                          order.orderStatus === "ORDER_CREATED" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-purple-100 text-purple-700"
                        }>
                          {order.orderStatus === "ORDER_CREATED" ? "New Order" : "Parts Sent"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isUrgent ? "text-red-600 font-medium" : ""}>
                          {daysUntilDue} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="link" size="sm" onClick={() => navigateToOrder(order.id)}>
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
                            <DropdownMenuItem onClick={() => navigateToOrder(order.id)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View Full BOM
                            </DropdownMenuItem>
                            {order.orderStatus === "ORDER_CREATED" && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(order.id, "PARTS_SENT_WAITING_ARRIVAL")}
                              >
                                <TruckIcon className="w-4 h-4 mr-2" />
                                Mark Parts Sent
                              </DropdownMenuItem>
                            )}
                            {order.orderStatus === "PARTS_SENT_WAITING_ARRIVAL" && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(order.id, "READY_FOR_PRE_QC")}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                Mark Parts Arrived
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

      {/* Future Enhancement Placeholder */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Service Order Requests</CardTitle>
          <CardDescription>
            Future feature for managing service part requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            This section will display service order requests when implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}