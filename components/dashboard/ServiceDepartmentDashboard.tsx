"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search,
  ShoppingCart,
  Package2,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Plus
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"
import { ServicePartsBrowser } from "@/components/service/ServicePartsBrowser"
import { ServiceOrderCart } from "@/components/service/ServiceOrderCart"
import { ServiceOrderHistory } from "@/components/service/ServiceOrderHistory"
import { ServiceAnalyticsDashboard } from "@/components/analytics/ServiceAnalyticsDashboard"

interface ServiceOrder {
  id: string
  requestTimestamp: string
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'RECEIVED'
  notes?: string
  procurementNotes?: string
  items: ServiceOrderItem[]
  requestedBy: {
    id: string
    fullName: string
    initials: string
  }
}

interface ServiceOrderItem {
  id: string
  partId: string
  quantityRequested: number
  quantityApproved?: number
  notes?: string
  part: {
    partId: string
    name: string
    photoURL?: string
    manufacturerPartNumber?: string
  }
}

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  approvedOrders: number
  rejectedOrders: number
}

const statusColors = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700", 
  REJECTED: "bg-red-100 text-red-700",
  ORDERED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-purple-100 text-purple-700"
}

const statusIcons = {
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  ORDERED: Truck,
  RECEIVED: Package2
}

export function ServiceDepartmentDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    rejectedOrders: 0
  })
  const [recentOrders, setRecentOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch recent service orders
      const response = await nextJsApiClient.get('/service-orders?limit=5')
      if (response.data.success) {
        const orders = response.data.data.serviceOrders
        setRecentOrders(orders)
        
        // Calculate stats
        const totalOrders = orders.length
        const pendingOrders = orders.filter((o: ServiceOrder) => o.status === 'PENDING_APPROVAL').length
        const approvedOrders = orders.filter((o: ServiceOrder) => o.status === 'APPROVED' || o.status === 'ORDERED' || o.status === 'RECEIVED').length
        const rejectedOrders = orders.filter((o: ServiceOrder) => o.status === 'REJECTED').length
        
        setStats({
          totalOrders,
          pendingOrders,
          approvedOrders,
          rejectedOrders
        })
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const onOrderCreated = () => {
    // Refresh dashboard data when a new order is created
    fetchDashboardData()
    // Switch to history tab to show the new order
    setActiveTab("history")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Service Department</h1>
        <p className="text-slate-600">
          Browse and order service parts for maintenance and repair
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
                <p className="text-sm text-slate-600">Total Orders</p>
              </div>
              <Package2 className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                <p className="text-sm text-slate-600">Pending Approval</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.approvedOrders}</p>
                <p className="text-sm text-slate-600">Approved</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rejectedOrders}</p>
                <p className="text-sm text-slate-600">Rejected</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="browse">Browse Parts</TabsTrigger>
          <TabsTrigger value="cart">Order Cart</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common service department tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab("browse")}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Browse Service Parts
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab("cart")}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  View Cart & Submit Order
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab("history")}
                >
                  <Package2 className="w-4 h-4 mr-2" />
                  View Order History
                </Button>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Your latest service part requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
                  </div>
                ) : recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {recentOrders.slice(0, 5).map((order) => {
                      const StatusIcon = statusIcons[order.status]
                      return (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <StatusIcon className="w-4 h-4 text-slate-500" />
                            <div>
                              <p className="font-medium text-sm">
                                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(order.requestTimestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={statusColors[order.status]}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500">
                    <Package2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No orders yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Browse Parts Tab */}
        <TabsContent value="browse">
          <ServicePartsBrowser />
        </TabsContent>

        {/* Order Cart Tab */}
        <TabsContent value="cart">
          <ServiceOrderCart onOrderCreated={onOrderCreated} />
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="history">
          <ServiceOrderHistory />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <ServiceAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}