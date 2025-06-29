"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Clock, 
  RefreshCw, 
  Loader2, 
  Eye, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck
} from "lucide-react"
import { format } from "date-fns"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@clerk/nextjs"

interface ServiceOrder {
  id: string
  status: string
  notes?: string
  requestTimestamp: string
  updatedAt: string
  items: Array<{
    id: string
    partId: string
    quantityRequested: number
    notes?: string
    part: {
      partId: string
      name: string
      photoURL?: string
      manufacturerPartNumber?: string
    }
  }>
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_APPROVAL: { 
    label: "Pending Approval", 
    color: "bg-yellow-100 text-yellow-700", 
    icon: AlertCircle 
  },
  APPROVED: { 
    label: "Approved", 
    color: "bg-blue-100 text-blue-700", 
    icon: CheckCircle 
  },
  REJECTED: { 
    label: "Rejected", 
    color: "bg-red-100 text-red-700", 
    icon: XCircle 
  },
  ORDERED: { 
    label: "Ordered", 
    color: "bg-purple-100 text-purple-700", 
    icon: Truck 
  },
  RECEIVED: { 
    label: "Received", 
    color: "bg-green-100 text-green-700", 
    icon: CheckCircle 
  },
}

export function ServiceOrderHistory() {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [isLoaded, user])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/service-orders')
      if (response.data.success) {
        const serviceOrders = response.data.data?.serviceOrders || []
        setOrders(Array.isArray(serviceOrders) ? serviceOrders : [])
      }
    } catch (error: any) {
      console.error('Error fetching service orders:', error)
      toast({
        title: "Error",
        description: "Failed to load order history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Package className="w-12 h-12 mx-auto text-slate-300" />
            <div>
              <h3 className="font-medium text-slate-900">Please Log In</h3>
              <p className="text-sm text-slate-600">
                Log in to view your service order history
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Order History
          </div>
          <Button 
            onClick={fetchOrders} 
            size="sm" 
            variant="outline"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : !Array.isArray(orders) || orders.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <Package className="w-12 h-12 mx-auto text-slate-300" />
            <div>
              <h3 className="font-medium text-slate-900">No Orders Yet</h3>
              <p className="text-sm text-slate-600">
                Your submitted service orders will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.PENDING_APPROVAL
              const StatusIcon = config.icon
              const isExpanded = expandedOrder === order.id
              
              return (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  {/* Order Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon className="w-4 h-4" />
                      <div>
                        <h4 className="font-medium text-sm">
                          Service Order #{order.id}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {format(new Date(order.requestTimestamp), "PPp")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                      <Button
                        onClick={() => toggleOrderDetails(order.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="text-sm text-slate-600">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} • 
                    Total quantity: {order.items.reduce((sum, item) => sum + item.quantityRequested, 0)}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="pt-3 border-t space-y-3">
                      {/* Items List */}
                      <div>
                        <h5 className="font-medium text-sm mb-2">Items:</h5>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded"
                            >
                              <div>
                                <span className="font-medium">{item.part.name}</span>
                                <span className="text-slate-500 ml-2">
                                  (ID: {item.partId})
                                </span>
                              </div>
                              <span className="font-medium">
                                Qty: {item.quantityRequested}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div>
                          <h5 className="font-medium text-sm mb-1">Notes:</h5>
                          <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                            {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="text-xs text-slate-500">
                        <p>Created: {format(new Date(order.requestTimestamp), "PPp")}</p>
                        {order.updatedAt !== order.requestTimestamp && (
                          <p>Updated: {format(new Date(order.updatedAt), "PPp")}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}