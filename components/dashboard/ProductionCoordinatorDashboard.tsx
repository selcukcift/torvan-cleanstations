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
  AlertCircle
} from "lucide-react"
import { format } from "date-fns"

// Status colors and display names
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

const statusDisplayNames: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  PARTS_SENT_WAITING_ARRIVAL: "Parts Sent - Waiting",
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
  "PARTS_SENT_WAITING_ARRIVAL",
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
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const ordersPerPage = 10

  // Dashboard statistics
  const [stats, setStats] = useState({
    totalActive: 0,
    awaitingParts: 0,
    inProduction: 0,
    readyToShip: 0
  })

  useEffect(() => {
    fetchOrders()
  }, [currentPage, statusFilter])

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
      
      if (order.orderStatus === "PARTS_SENT_WAITING_ARRIVAL") {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Coordinator Dashboard</h2>
          <p className="text-slate-600">Manage orders and track production status</p>
        </div>
        <Button onClick={createNewOrder}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Order
        </Button>
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
                  {PC_RELEVANT_STATUSES.map(status => (
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
                    <TableRow key={order.id}>
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
                        {order.currentAssignee || "-"}
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
    </div>
  )
}