"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Package, 
  ShoppingCart, 
  BarChart3, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  ExternalLink,
  TruckIcon,
  FileText,
  Search,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Order {
  id: string
  poNumber: string
  customerName: string
  projectName?: string
  wantDate: string
  orderStatus: string
  procurementNeeded?: boolean
  procurementSummary?: {
    totalParts: number
    partsSent: number
    partsReceived: number
    partsPending: number
  }
}

interface ServiceRequest {
  id: string
  requestNumber: string
  department: string
  priority: string
  status: string
  createdAt: string
  itemsCount: number
  estimatedValue?: number
}

interface DashboardStats {
  pendingOrders: number
  serviceRequests: number
  inventoryItems: number
  urgentItems: number
}

export function ProcurementSpecialistDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    serviceRequests: 0,
    inventoryItems: 0,
    urgentItems: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load procurement orders - only show orders that truly need procurement work
      const ordersResponse = await fetch(`/api/orders?limit=50&t=${Date.now()}`) // Cache busting
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        const allOrders = ordersData.data || []
        
        // STRICT filtering - only ORDER_CREATED status orders need procurement
        const procurementOrders = allOrders.filter((order: Order) => {
          const isNewOrder = order.orderStatus === "ORDER_CREATED"
          
          // Debug: Log all orders for troubleshooting
          console.log(`[${new Date().toLocaleTimeString()}] Order ${order.poNumber}: status=${order.orderStatus}, needsProcurement=${isNewOrder}`)
          
          return isNewOrder
        })
        
        console.log(`[${new Date().toLocaleTimeString()}] Found ${procurementOrders.length} orders needing procurement out of ${allOrders.length} total orders`)
        console.log(`[${new Date().toLocaleTimeString()}] Procurement orders:`, procurementOrders.map(o => ({ po: o.poNumber, status: o.orderStatus })))
        
        setOrders(procurementOrders.slice(0, 5)) // Show latest 5
        setStats(prev => ({ ...prev, pendingOrders: procurementOrders.length }))
      }

      // Load service requests
      const serviceResponse = await fetch('/api/procurement/service-requests')
      if (serviceResponse.ok) {
        const serviceData = await serviceResponse.json()
        const requests = serviceData.data || []
        setServiceRequests(requests.slice(0, 5)) // Show latest 5
        setStats(prev => ({ 
          ...prev, 
          serviceRequests: requests.length,
          urgentItems: requests.filter((r: ServiceRequest) => r.priority === 'HIGH').length
        }))
      }

      // Load inventory stats
      const inventoryResponse = await fetch('/api/procurement/inventory/hierarchy')
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json()
        setStats(prev => ({ 
          ...prev, 
          inventoryItems: inventoryData.data?.stats?.totalParts + inventoryData.data?.stats?.totalAssemblies || 0
        }))
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ORDER_CREATED: { label: "New", className: "bg-blue-100 text-blue-700" },
      SINK_BODY_EXTERNAL_PRODUCTION: { label: "External Production", className: "bg-purple-100 text-purple-700" },
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
      IN_PROGRESS: { label: "In Progress", className: "bg-orange-100 text-orange-700" },
      COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
    }
    
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { className: string }> = {
      HIGH: { className: "bg-red-100 text-red-700" },
      MEDIUM: { className: "bg-yellow-100 text-yellow-700" },
      LOW: { className: "bg-green-100 text-green-700" },
    }
    
    const config = priorityConfig[priority] || { className: "bg-gray-100 text-gray-700" }
    return <Badge className={config.className}>{priority}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Procurement Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Manage orders, service requests, and inventory procurement
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/procurement/inventory')} variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Inventory Browser
          </Button>
          <Button onClick={() => router.push('/procurement')} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Full Procurement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">New Orders</p>
                <p className="text-3xl font-bold text-blue-600">{stats.pendingOrders}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Orders awaiting procurement setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Service Requests</p>
                <p className="text-3xl font-bold text-orange-600">{stats.serviceRequests}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Parts requests from service</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Inventory Items</p>
                <p className="text-3xl font-bold text-green-600">{stats.inventoryItems}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Total parts & assemblies</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Urgent Items</p>
                <p className="text-3xl font-bold text-red-600">{stats.urgentItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-slate-500 mt-2">High priority requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Order Reviews</TabsTrigger>
          <TabsTrigger value="service">Service Requests</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Overview</TabsTrigger>
        </TabsList>

        {/* Order Reviews Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Orders Requiring Procurement</CardTitle>
                  <CardDescription>
                    New orders awaiting parts sourcing and external manufacturing setup
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/procurement')}
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No new orders requiring procurement at this time</p>
                  <p className="text-sm text-gray-400 mt-2">Orders will appear here when they need parts sourcing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Package className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{order.poNumber}</p>
                          <p className="text-sm text-gray-600">{order.customerName}</p>
                          {order.projectName && (
                            <p className="text-xs text-gray-500">{order.projectName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Due: {new Date(order.wantDate).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(order.orderStatus)}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/procurement/orders/${order.id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Requests Tab */}
        <TabsContent value="service">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Service Parts Requests</CardTitle>
                  <CardDescription>
                    Parts requests from service department
                  </CardDescription>
                </div>
                <Button variant="outline">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {serviceRequests.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No service requests at this time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {serviceRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <ShoppingCart className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">{request.requestNumber}</p>
                          <p className="text-sm text-gray-600">{request.department}</p>
                          <p className="text-xs text-gray-500">
                            {request.itemsCount} items • {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getPriorityBadge(request.priority)}
                        {getStatusBadge(request.status)}
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Overview Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inventory Browser</CardTitle>
                  <CardDescription>
                    Explore hierarchical parts and assemblies structure
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => router.push('/procurement/inventory')}
                >
                  Open Full Browser
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium">Categories</p>
                  <p className="text-2xl font-bold text-blue-600">6</p>
                  <p className="text-xs text-gray-500">Main categories</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium">Assemblies</p>
                  <p className="text-2xl font-bold text-green-600">318</p>
                  <p className="text-xs text-gray-500">Buildable products</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <FileText className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-medium">Parts</p>
                  <p className="text-2xl font-bold text-orange-600">283</p>
                  <p className="text-xs text-gray-500">Individual components</p>
                </div>
              </div>

              <div className="mt-6">
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    The inventory browser provides a complete hierarchical view of all parts and assemblies.
                    Use it to understand component relationships and plan procurement activities.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common procurement tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4"
              onClick={() => router.push('/procurement/inventory')}
            >
              <Search className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Browse Inventory</p>
                <p className="text-xs text-gray-500">Hierarchical parts browser</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4"
              onClick={() => router.push('/procurement')}
            >
              <Package className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Review Orders</p>
                <p className="text-xs text-gray-500">Orders needing procurement</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4"
              onClick={() => router.push('/orders')}
            >
              <Package className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">View All Orders</p>
                <p className="text-xs text-gray-500">Browse all order statuses</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-auto p-4"
            >
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Generate Reports</p>
                <p className="text-xs text-gray-500">Procurement analytics</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}