"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  FileText,
  Users,
  Activity,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  Trash2,
  Factory,
  BarChart3,
  Timer,
  Target
} from "lucide-react"
import { format } from "date-fns"

// All status options for admin
const ALL_STATUSES = [
  "ORDER_CREATED",
  "SINK_BODY_EXTERNAL_PRODUCTION",
  "READY_FOR_PRE_QC",
  "READY_FOR_PRODUCTION",
  "TESTING_COMPLETE",
  "PACKAGING_COMPLETE",
  "READY_FOR_FINAL_QC",
  "READY_FOR_SHIP",
  "SHIPPED"
]

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

export function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [dateFilter, setDateFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<{ id: string; poNumber: string } | null>(null)
  const ordersPerPage = 15

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    overdueOrders: 0
  })

  const [productionStats, setProductionStats] = useState({
    inProduction: 0,
    completedToday: 0,
    avgCycleTime: 0,
    qualityScore: 0
  })

  const [activeTab, setActiveTab] = useState("orders")

  useEffect(() => {
    fetchOrders()
    fetchProductionStats()
  }, [currentPage, statusFilter, searchTerm, dateFilter])

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchOrders()
      fetchProductionStats()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Also refresh when component mounts
  useEffect(() => {
    fetchOrders()
    fetchProductionStats()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
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

      const response = await nextJsApiClient.get(`/orders?${params}`)
      
      if (response.data.success) {
        setOrders(response.data.data)
        setTotalPages(response.data.pagination.pages)
        setTotalOrders(response.data.pagination.total)
        
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
    const today = new Date()
    const stats = {
      totalOrders: totalOrders,
      activeOrders: 0,
      completedOrders: 0,
      overdueOrders: 0
    }

    ordersList.forEach(order => {
      if (order.orderStatus === "SHIPPED") {
        stats.completedOrders++
      } else {
        stats.activeOrders++
        
        const wantDate = new Date(order.wantDate)
        if (wantDate < today) {
          stats.overdueOrders++
        }
      }
    })

    setStats(stats)
  }

  const fetchProductionStats = async () => {
    try {
      const response = await nextJsApiClient.get('/production/metrics?days=1')
      
      if (response.data.success && response.data.data.length > 0) {
        const todayMetrics = response.data.data[0]
        
        // Also fetch current production orders
        const productionResponse = await nextJsApiClient.get('/orders', {
          params: {
            status: 'READY_FOR_PRODUCTION,TESTING_COMPLETE,PACKAGING_COMPLETE'
          }
        })
        
        if (productionResponse.data.success) {
          setProductionStats({
            inProduction: productionResponse.data.data.length,
            completedToday: todayMetrics.ordersCompleted || 0,
            avgCycleTime: Math.round(todayMetrics.avgCycleTime || 0),
            qualityScore: Math.round(todayMetrics.qualityScore || 0)
          })
        }
      }
    } catch (error: any) {
      // Silent fail for production stats as it's not critical
      console.warn('Could not fetch production stats:', error)
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

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return

    try {
      const response = await nextJsApiClient.delete(`/orders/${orderToDelete.id}`)
      
      toast({
        title: "Order Deleted",
        description: `Order ${orderToDelete.poNumber} has been permanently deleted.`,
      })
      
      // Refresh the orders list
      fetchOrders()
      
      // Close the dialog
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
    } catch (error: any) {
      console.error("Error deleting order:", error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Failed to delete order. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (order: any) => {
    setOrderToDelete({ id: order.id, poNumber: order.poNumber })
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-slate-600">Complete system overview and management</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push("/production")}>
            <Factory className="w-4 h-4 mr-2" />
            Production Dashboard
          </Button>
          <Button onClick={createNewOrder}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Order
          </Button>
        </div>
      </div>

      {/* Statistics - Combined Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalOrders}</span>
              <Package className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.activeOrders}</span>
              <Activity className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Completed Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.completedOrders}</span>
              <Shield className="w-8 h-8 text-gray-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Overdue Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{stats.overdueOrders}</span>
              <Activity className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Production Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              In Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">{productionStats.inProduction}</span>
              <Factory className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{productionStats.completedToday}</span>
              <Shield className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg Cycle Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">{productionStats.avgCycleTime}h</span>
              <Timer className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-purple-600">{productionStats.qualityScore}%</span>
              <Target className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/admin/users")}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </CardTitle>
            <CardDescription>Manage users and permissions</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/admin/system")}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>System Settings</span>
            </CardTitle>
            <CardDescription>Configure system parameters</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/admin/logs")}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>System Logs</span>
            </CardTitle>
            <CardDescription>View system activity and analytics</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* All Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>
                Complete list of all orders in the system
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <Input
                  placeholder="Search PO Number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button type="submit" size="sm" variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </form>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {ALL_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>
                      {statusDisplayNames[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
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
                    <TableHead>PO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sales Person</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Want Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.poNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.salesPerson}</TableCell>
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
                      <TableCell>{order.createdBy.fullName}</TableCell>
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
                            <DropdownMenuItem>
                              <FileText className="w-4 h-4 mr-2" />
                              Export BOM
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(order)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Order
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order <strong>{orderToDelete?.poNumber}</strong> and all associated data including:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Order configurations and BOM</li>
              <li>Quality control tasks and results</li>
              <li>Assembly tasks and history</li>
              <li>Comments and notifications</li>
              <li>All associated files and documents</li>
            </ul>
            <p className="text-red-600 font-semibold mt-4 text-sm">This action cannot be undone.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700">
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}