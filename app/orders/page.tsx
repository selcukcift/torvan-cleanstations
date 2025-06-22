"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { 
  Package, 
  Search, 
  Filter,
  Calendar,
  User,
  ExternalLink,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AppHeader } from "@/components/ui/app-header"
import { format } from "date-fns"

interface Order {
  id: string
  poNumber: string
  customerName: string
  projectName?: string
  salesPerson: string
  wantDate: string
  orderStatus: string
  buildNumbers: string[]
  createdAt: string
  createdBy: {
    fullName: string
  }
}

export default function OrdersListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])

  useEffect(() => {
    if (session) {
      loadOrders()
    }
  }, [session])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders?limit=50')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.data || [])
      } else {
        console.error('Failed to load orders')
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(order => 
        order.poNumber.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.projectName?.toLowerCase().includes(searchLower) ||
        order.salesPerson.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.orderStatus === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ORDER_CREATED: { label: "New", className: "bg-blue-100 text-blue-700" },
      SINK_BODY_EXTERNAL_PRODUCTION: { label: "External Production", className: "bg-purple-100 text-purple-700" },
      READY_FOR_PRE_QC: { label: "Ready for Pre-QC", className: "bg-yellow-100 text-yellow-700" },
      READY_FOR_PRODUCTION: { label: "Ready for Production", className: "bg-green-100 text-green-700" },
      TESTING_COMPLETE: { label: "Testing Complete", className: "bg-teal-100 text-teal-700" },
      PACKAGING_COMPLETE: { label: "Packaging Complete", className: "bg-indigo-100 text-indigo-700" },
      READY_FOR_FINAL_QC: { label: "Ready for Final QC", className: "bg-orange-100 text-orange-700" },
      READY_FOR_SHIP: { label: "Ready to Ship", className: "bg-emerald-100 text-emerald-700" },
      SHIPPED: { label: "Shipped", className: "bg-gray-100 text-gray-700" },
    }
    
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getUniqueStatuses = () => {
    const statuses = [...new Set(orders.map(order => order.orderStatus))]
    return statuses.sort()
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">All Orders</h1>
              <p className="text-slate-600 mt-1">
                Browse and manage CleanStation production orders
              </p>
            </div>
            <div className="flex gap-2">
              {(session.user?.role === 'ADMIN' || session.user?.role === 'PRODUCTION_COORDINATOR') && (
                <Button onClick={() => router.push('/orders/create')}>
                  <Package className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search orders... (PO number, customer, project, sales person)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {getUniqueStatuses().map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-slate-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {loading ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters to see more results."
                    : "No orders have been created yet."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{order.poNumber}</h3>
                          {getStatusBadge(order.orderStatus)}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {order.customerName}
                            </span>
                            {order.projectName && (
                              <span>• {order.projectName}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {format(new Date(order.wantDate), 'MMM dd, yyyy')}
                            </span>
                            <span>• Sales: {order.salesPerson}</span>
                            <span>• Builds: {order.buildNumbers.join(', ')}</span>
                          </div>

                          <div className="text-xs text-gray-500">
                            Created {format(new Date(order.createdAt), 'MMM dd, yyyy')} by {order.createdBy.fullName}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}