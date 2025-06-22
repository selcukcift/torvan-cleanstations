"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppHeader } from "@/components/ui/app-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  Search,
  AlertCircle,
  Loader2,
  Eye,
  TruckIcon,
  CheckCircle,
  Clock,
} from "lucide-react"
import { format } from "date-fns"
import { toTitleCase } from "@/lib/utils"

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

export default function ProcurementPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [externalProductionCount, setExternalProductionCount] = useState(0)

  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in procurement page:', event.reason)
      event.preventDefault() // Prevent the default browser error handling
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Check user role
  const userRole = session?.user?.role
  const hasAccess = ["ADMIN", "PROCUREMENT_SPECIALIST"].includes(userRole || "")

  useEffect(() => {
    if (session && hasAccess) {
      fetchOrders().catch(error => {
        console.error('Error in fetchOrders useEffect:', error)
      })
    }
  }, [session, hasAccess])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      
      // Fetch orders that need procurement attention
      const response = await nextJsApiClient.get("/orders", {
        params: {
          limit: 100, // Get more orders to ensure we catch all relevant ones
          t: Date.now() // Cache busting
        }
      })

      if (response.data.success) {
        // Filter orders to only those that need procurement attention
        const ordersData = response.data.data || []
        
        // Count external production orders for stats
        const externalProductionOrders = ordersData.filter((order: Order) => 
          order && order.orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION"
        )
        setExternalProductionCount(externalProductionOrders.length)
        console.log(`[PROCUREMENT] Found ${externalProductionOrders.length} orders in external production`)
        
        const relevantStatusOrders = ordersData.filter((order: Order) => 
          order && order.orderStatus && ["ORDER_CREATED"].includes(order.orderStatus)
        )
        console.log(`[PROCUREMENT] Found ${relevantStatusOrders.length} ORDER_CREATED orders to check for procurement needs`)
        
        // Check each order for procurement needs
        const ordersWithProcurement = await Promise.all(
          relevantStatusOrders.map(async (order: Order) => {
            try {
              // Get Single Source of Truth to check for legs/feet parts
              const sotResponse = await nextJsApiClient.get(`/orders/${order.id}/source-of-truth`)
              
              if (sotResponse.data.success) {
                const bomItems = sotResponse.data.data?.billOfMaterials?.flattened || []
                const PROCUREMENT_PATTERNS = [
                  "T2-DL27-KIT",
                  "T2-DL14-KIT", 
                  "T2-LC1-KIT",
                  "T2-DL27-FH-KIT",
                  "T2-DL14-FH-KIT",
                  "T2-LEVELING-CASTOR-475",
                  "T2-SEISMIC-FEET"
                ]
                
                const procurementParts = bomItems.filter((item: any) => {
                  const partNumber = item.id || item.assemblyId || item.partNumber || ""
                  return PROCUREMENT_PATTERNS.includes(partNumber)
                })
                
                // Get tracking data
                const trackingResponse = await nextJsApiClient.get(`/orders/${order.id}/outsourced-parts`)
                const trackedParts = (trackingResponse.data.success && trackingResponse.data.data) ? trackingResponse.data.data : []
                
                return {
                  ...order,
                  procurementNeeded: procurementParts.length > 0,
                  procurementSummary: {
                    totalParts: procurementParts.length,
                    partsSent: trackedParts.filter((p: any) => p.status === 'SENT').length,
                    partsReceived: trackedParts.filter((p: any) => p.status === 'RECEIVED').length,
                    partsPending: trackedParts.filter((p: any) => p.status === 'PENDING' || !p.status).length
                  }
                }
              }
            } catch (error) {
              console.error(`Failed to check procurement for order ${order.id}:`, error)
            }
            
            return order
          })
        )

        // Filter to only show orders that need procurement
        const finalOrders = ordersWithProcurement.filter(order => order.procurementNeeded)
        console.log(`[PROCUREMENT] Final filtered orders:`, finalOrders.map(o => ({ po: o.poNumber, status: o.orderStatus, needed: o.procurementNeeded })))
        setOrders(finalOrders)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!order) return false
    
    const matchesSearch = 
      (order.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (order.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesStatus = 
      statusFilter === "all" || 
      order.orderStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ORDER_CREATED: { label: "New Order", className: "bg-blue-100 text-blue-700" },
      SINK_BODY_EXTERNAL_PRODUCTION: { label: "External Production", className: "bg-purple-100 text-purple-700" },
    }
    
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" }
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const getProcurementBadge = (summary?: Order['procurementSummary']) => {
    if (!summary) return null
    
    if (summary.partsReceived === summary.totalParts && summary.totalParts > 0) {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          All Received
        </Badge>
      )
    }
    
    if (summary.partsSent > 0) {
      return (
        <Badge className="bg-purple-100 text-purple-700">
          <TruckIcon className="w-3 h-3 mr-1" />
          {summary.partsSent}/{summary.totalParts} Sent
        </Badge>
      )
    }
    
    return (
      <Badge className="bg-yellow-100 text-yellow-700">
        <Clock className="w-3 h-3 mr-1" />
        {summary.partsPending} Pending
      </Badge>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="container mx-auto p-8">
          <Card>
            <CardContent className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading session...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="container mx-auto p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access the procurement page. 
              This page is only available to Procurement Specialists and Administrators.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Procurement Management</h1>
              <p className="text-slate-600">
                Manage parts that need to be sent to sink body manufacturer
              </p>
            </div>
            <Button
              onClick={() => router.push('/procurement/inventory')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Inventory Browser
            </Button>
          </div>
        </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Orders Requiring Procurement</CardTitle>
          <CardDescription>
            New orders with legs or casters that need to be sent to sink body manufacturer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by PO number, customer, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ORDER_CREATED">New Orders</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => fetchOrders().catch(error => console.error('Error refreshing orders:', error))} variant="outline">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading procurement orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">
                {searchTerm || statusFilter !== "all" 
                  ? "No orders match your search criteria"
                  : "No orders require procurement at this time"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Want Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Procurement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.poNumber}</TableCell>
                    <TableCell>{toTitleCase(order.customerName)}</TableCell>
                    <TableCell>{order.projectName ? toTitleCase(order.projectName) : "-"}</TableCell>
                    <TableCell>{format(new Date(order.wantDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(order.orderStatus)}</TableCell>
                    <TableCell>{getProcurementBadge(order.procurementSummary)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => router.push(`/procurement/orders/${order.id}`)}
                        size="sm"
                        variant="default"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Order
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders Requiring Procurement</CardTitle>
            <CardDescription>New orders needing parts sourcing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">In External Production</CardTitle>
            <CardDescription>Parts sent to manufacturer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {externalProductionCount}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}