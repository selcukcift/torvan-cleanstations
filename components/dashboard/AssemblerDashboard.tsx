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
  Wrench,
  Play,
  CheckCircle,
  Eye,
  ClipboardCheck,
  MoreHorizontal,
  Loader2,
  Package,
  Clock,
  AlertCircle
} from "lucide-react"
import { format } from "date-fns"

export function AssemblerDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    readyForProduction: 0,
    inProgress: 0,
    awaitingQC: 0
  })
  const [serviceOrders, setServiceOrders] = useState<any[]>([])
  const [serviceOrdersLoading, setServiceOrdersLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    fetchServiceOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await nextJsApiClient.get("/orders?limit=50")
      
      if (response.data.success) {
        // Filter for assembler-relevant statuses
        const assemblerOrders = response.data.data.filter((order: any) => 
          ["ReadyForProduction", "TESTING_COMPLETE", "PACKAGING_COMPLETE"].includes(order.orderStatus)
        )
        
        setOrders(assemblerOrders)
        calculateStats(assemblerOrders)
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
      readyForProduction: 0,
      inProgress: 0,
      awaitingQC: 0
    }

    ordersList.forEach(order => {
      if (order.orderStatus === "ReadyForProduction") {
        stats.readyForProduction++
      } else if (order.orderStatus === "TESTING_COMPLETE") {
        stats.inProgress++
      } else if (order.orderStatus === "PACKAGING_COMPLETE") {
        stats.awaitingQC++
      }
    })

    setStats(stats)
  }

  const fetchServiceOrders = async () => {
    setServiceOrdersLoading(true)
    try {
      const response = await nextJsApiClient.get("/service-orders?limit=10")
      
      if (response.data.success) {
        // Filter for approved service orders that might affect production
        const relevantServiceOrders = response.data.data.serviceOrders.filter((order: any) => 
          ["APPROVED", "ORDERED"].includes(order.status)
        )
        
        setServiceOrders(relevantServiceOrders)
      }
    } catch (error: any) {
      console.error('Error fetching service orders:', error)
      // Don't show error toast for service orders as it's secondary information
    } finally {
      setServiceOrdersLoading(false)
    }
  }

  const navigateToOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const handleStartAssembly = async (orderId: string) => {
    try {
      // Navigate to order detail page and assign to current user
      router.push(`/orders/${orderId}`)
      
      // Also update status to indicate assembly has been started
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "TESTING_COMPLETE",
        notes: "Assembly started by assembler"
      })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Assembly started - redirecting to order details"
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start assembly",
        variant: "destructive"
      })
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const statusMessages: Record<string, string> = {
        TESTING_COMPLETE: "Assembly started",
        PACKAGING_COMPLETE: "Testing completed, packaging done",
        ReadyForFinalQC: "Assembly and packaging complete"
      }

      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus,
        notes: statusMessages[newStatus] || "Status updated"
      })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Order status updated successfully"
        })
        fetchOrders()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        variant: "destructive"
      })
    }
  }

  const getSinkModelFromOrder = (order: any) => {
    // Extract sink model from configurations or BOM
    return order.configurations?.[order.buildNumbers[0]]?.sinkModelId || "N/A"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Assembler Dashboard</h2>
        <p className="text-slate-600">Manage assembly tasks and track production progress</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Ready for Assembly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.readyForProduction}</span>
              <Wrench className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting assembly start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.inProgress}</span>
              <Clock className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Currently being assembled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Awaiting QC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.awaitingQC}</span>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Completed, pending QC</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assembly Tasks</CardTitle>
          <CardDescription>
            Orders assigned for assembly or currently in production
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
              <p className="text-slate-600">No assembly tasks available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Sink Type/Model</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const dueDate = new Date(order.wantDate)
                  const today = new Date()
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgent = daysUntilDue <= 7

                  return (
                    <TableRow key={order.id} data-testid="order-card" data-order-id={order.id}>
                      <TableCell className="font-medium">{order.poNumber}</TableCell>
                      <TableCell>{getSinkModelFromOrder(order)}</TableCell>
                      <TableCell>{format(dueDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Badge className={
                          order.orderStatus === "ReadyForProduction" 
                            ? "bg-orange-100 text-orange-700"
                            : order.orderStatus === "TESTING_COMPLETE"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }>
                          {order.orderStatus === "ReadyForProduction" ? "Ready to Start" :
                           order.orderStatus === "TESTING_COMPLETE" ? "In Progress" :
                           "Packaging Complete"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isUrgent ? (
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-600 font-medium">Urgent</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">Normal</span>
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
                            {order.orderStatus === "ReadyForProduction" && (
                              <DropdownMenuItem 
                                onClick={() => handleStartAssembly(order.id)}
                                data-testid="start-assembly-button"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Start Assembly
                              </DropdownMenuItem>
                            )}
                            {order.orderStatus === "TESTING_COMPLETE" && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(order.id, "PACKAGING_COMPLETE")}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Complete Assembly
                              </DropdownMenuItem>
                            )}
                            {order.orderStatus === "PACKAGING_COMPLETE" && (
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(order.id, "ReadyForFinalQC")}
                              >
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                Submit for QC
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              View QC Checklist
                            </DropdownMenuItem>
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

      {/* Service Orders Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Service Orders Activity
          </CardTitle>
          <CardDescription>
            Recent service orders that may affect parts availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceOrdersLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : serviceOrders.length > 0 ? (
            <div className="space-y-3">
              {serviceOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                      {order.requestedBy.initials}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {order.items.length} part{order.items.length !== 1 ? 's' : ''} - {order.requestedBy.fullName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(order.requestTimestamp), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      order.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 
                      order.status === 'ORDERED' ? 'bg-blue-50 text-blue-700' : 
                      'bg-slate-50 text-slate-700'
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              ))}
              {serviceOrders.length > 5 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  And {serviceOrders.length - 5} more service orders...
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-slate-500">No recent service orders affecting production</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}