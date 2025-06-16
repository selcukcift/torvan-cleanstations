"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  CheckCircle, 
  XCircle, 
  Package, 
  Clock, 
  User,
  FileText,
  Eye,
  Loader2
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

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
    email: string
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

const statusColors = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700", 
  REJECTED: "bg-red-100 text-red-700",
  ORDERED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-purple-100 text-purple-700"
}

export function ServiceOrderApproval() {
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingOrders()
  }, [])

  const fetchPendingOrders = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/service-orders?status=PENDING_APPROVAL')
      if (response.data.success) {
        setOrders(response.data.data.serviceOrders)
      }
    } catch (error: any) {
      console.error('Error fetching pending service orders:', error)
      toast({
        title: "Error",
        description: "Failed to load pending service orders",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (orderId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessingOrderId(orderId)
      
      const response = await nextJsApiClient.post(`/v1/service/orders/${orderId}/approve`, {
        action: action === 'APPROVED' ? 'APPROVE' : 'REJECT',
        procurementNotes: approvalNotes
      })

      if (response.data.success) {
        toast({
          title: `Order ${action.toLowerCase()}`,
          description: `Service order has been ${action.toLowerCase()} successfully`
        })
        
        // Remove the processed order from the list
        setOrders(prev => prev.filter(order => order.id !== orderId))
        setSelectedOrder(null)
        setApprovalNotes("")
      } else {
        throw new Error(response.data.message || `Failed to ${action.toLowerCase()} order`)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || `Failed to ${action.toLowerCase()} service order`,
        variant: "destructive"
      })
    } finally {
      setProcessingOrderId(null)
    }
  }

  const openOrderDetails = (order: ServiceOrder) => {
    setSelectedOrder(order)
    setApprovalNotes("")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Service Order Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Service Order Approvals
            </div>
            <Badge variant={orders.length > 0 ? "default" : "secondary"}>
              {orders.length} pending
            </Badge>
          </CardTitle>
          <CardDescription>
            Review and approve service parts requests from the Service Department
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Approvals</h3>
            <p className="text-slate-600">
              All service orders have been processed. Great work!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                          {order.requestedBy.initials}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.requestedBy.fullName}</p>
                          <p className="text-xs text-slate-500">{order.requestedBy.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                        <p className="text-slate-500">
                          Total qty: {order.items.reduce((sum, item) => sum + item.quantityRequested, 0)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.requestTimestamp), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openOrderDetails(order)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Service Order Review</DialogTitle>
                              <DialogDescription>
                                Review the details and approve or reject this service order
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedOrder && (
                              <div className="space-y-6">
                                {/* Order Info */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Order ID</Label>
                                    <p className="text-sm text-slate-600">{selectedOrder.id}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Request Date</Label>
                                    <p className="text-sm text-slate-600">
                                      {format(new Date(selectedOrder.requestTimestamp), 'MMM d, yyyy HH:mm')}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Requested By</Label>
                                    <p className="text-sm text-slate-600">{selectedOrder.requestedBy.fullName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Email</Label>
                                    <p className="text-sm text-slate-600">{selectedOrder.requestedBy.email}</p>
                                  </div>
                                </div>

                                {/* Order Notes */}
                                {selectedOrder.notes && (
                                  <div>
                                    <Label className="text-sm font-medium">Order Notes</Label>
                                    <div className="mt-1 p-3 bg-slate-50 rounded-md">
                                      <p className="text-sm text-slate-700">{selectedOrder.notes}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Items Table */}
                                <div>
                                  <Label className="text-sm font-medium">Requested Items</Label>
                                  <div className="mt-2 border rounded-md">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Part</TableHead>
                                          <TableHead>Part ID</TableHead>
                                          <TableHead>MPN</TableHead>
                                          <TableHead>Quantity</TableHead>
                                          <TableHead>Notes</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedOrder.items.map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell>
                                              <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                                  {item.part.photoURL ? (
                                                    <img 
                                                      src={item.part.photoURL} 
                                                      alt={item.part.name}
                                                      className="w-full h-full object-cover rounded"
                                                    />
                                                  ) : (
                                                    <Package className="w-5 h-5 text-slate-400" />
                                                  )}
                                                </div>
                                                <div>
                                                  <p className="font-medium text-sm">{item.part.name}</p>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                              {item.partId}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                              {item.part.manufacturerPartNumber || '-'}
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline">
                                                {item.quantityRequested}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                              {item.notes || '-'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>

                                {/* Approval Notes */}
                                <div>
                                  <Label htmlFor="approval-notes" className="text-sm font-medium">
                                    Procurement Notes (Optional)
                                  </Label>
                                  <Textarea
                                    id="approval-notes"
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    placeholder="Add any notes about this approval/rejection..."
                                    rows={3}
                                    className="mt-1"
                                  />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t">
                                  <Button
                                    onClick={() => handleApproval(selectedOrder.id, 'APPROVED')}
                                    className="flex-1"
                                    disabled={processingOrderId === selectedOrder.id}
                                  >
                                    {processingOrderId === selectedOrder.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Approve Order
                                  </Button>
                                  <Button
                                    onClick={() => handleApproval(selectedOrder.id, 'REJECTED')}
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={processingOrderId === selectedOrder.id}
                                  >
                                    {processingOrderId === selectedOrder.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Reject Order
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}