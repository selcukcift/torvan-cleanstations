"use client"

import { useState, useEffect } from "react"
import { 
  ShoppingCart, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  ExternalLink,
  Package,
  FileText,
  User,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"

interface ServiceRequestItem {
  id: string
  assemblyId: string
  assemblyName: string
  assemblyType: string
  quantity: number
  unitPrice: number | null
  totalPrice: number
  notes?: string
}

interface ServiceRequest {
  id: string
  requestNumber: string
  department: string
  requestedBy: string
  priority: string
  status: string
  createdAt: string
  approvedAt?: string
  itemsCount: number
  uniqueItemsCount: number
  estimatedValue: number
  notes?: string
  items: ServiceRequestItem[]
}

interface ServicePartsRequestsProps {
  maxItems?: number
  showHeader?: boolean
}

export function ServicePartsRequests({ maxItems = 10, showHeader = true }: ServicePartsRequestsProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [actionNotes, setActionNotes] = useState("")
  const [processingAction, setProcessingAction] = useState(false)

  useEffect(() => {
    loadServiceRequests()
  }, [])

  const loadServiceRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/procurement/service-requests?limit=${maxItems}`)
      
      if (response.ok) {
        const data = await response.json()
        setRequests(data.data || [])
      } else {
        console.error('Failed to load service requests')
      }
    } catch (error) {
      console.error('Error loading service requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (requestId: string, action: string) => {
    try {
      setProcessingAction(true)
      
      const response = await fetch('/api/procurement/service-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceOrderId: requestId,
          action: action,
          notes: actionNotes
        })
      })

      if (response.ok) {
        await loadServiceRequests()
        setSelectedRequest(null)
        setActionNotes("")
        // You could add a toast notification here
      } else {
        console.error('Failed to update service request')
      }
    } catch (error) {
      console.error('Error updating service request:', error)
    } finally {
      setProcessingAction(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { className: string; icon: JSX.Element }> = {
      HIGH: { 
        className: "bg-red-100 text-red-700 border-red-200", 
        icon: <AlertTriangle className="h-3 w-3" />
      },
      MEDIUM: { 
        className: "bg-yellow-100 text-yellow-700 border-yellow-200", 
        icon: <Clock className="h-3 w-3" />
      },
      LOW: { 
        className: "bg-green-100 text-green-700 border-green-200", 
        icon: <CheckCircle className="h-3 w-3" />
      },
    }
    
    const config = priorityConfig[priority] || { 
      className: "bg-gray-100 text-gray-700 border-gray-200", 
      icon: <Clock className="h-3 w-3" />
    }
    
    return (
      <Badge className={config.className}>
        {config.icon}
        <span className="ml-1">{priority}</span>
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
      APPROVED: { label: "Approved", className: "bg-blue-100 text-blue-700" },
      IN_PROGRESS: { label: "In Progress", className: "bg-orange-100 text-orange-700" },
      FULFILLED: { label: "Fulfilled", className: "bg-green-100 text-green-700" },
      CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-700" },
    }
    
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getActionButtons = (request: ServiceRequest) => {
    const buttons = []

    if (request.status === 'APPROVED') {
      buttons.push(
        <Button
          key="start"
          size="sm"
          onClick={() => handleAction(request.id, 'start_fulfillment')}
          disabled={processingAction}
        >
          Start Fulfillment
        </Button>
      )
    }

    if (request.status === 'IN_PROGRESS') {
      buttons.push(
        <Button
          key="fulfill"
          size="sm"
          onClick={() => handleAction(request.id, 'mark_fulfilled')}
          disabled={processingAction}
        >
          Mark Fulfilled
        </Button>
      )
    }

    buttons.push(
      <Dialog key="details">
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedRequest(request)}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
            <DialogDescription>
              {request.requestNumber} - {request.department}
            </DialogDescription>
          </DialogHeader>
          <ServiceRequestDetails request={request} onAction={handleAction} />
        </DialogContent>
      </Dialog>
    )

    return buttons
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Service Parts Requests
          </CardTitle>
          <CardDescription>
            Parts requests from service department requiring procurement action
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No service requests at this time</p>
            <p className="text-sm text-gray-400">
              Service department requests will appear here when submitted
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{request.requestNumber}</h4>
                        {getPriorityBadge(request.priority)}
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.requestedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {request.uniqueItemsCount} unique items ({request.itemsCount} total)
                          </span>
                          {request.estimatedValue > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Est. ${request.estimatedValue.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {request.notes && (
                        <p className="text-xs text-gray-500 mt-2 max-w-md">
                          {request.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getActionButtons(request)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ServiceRequestDetails({ 
  request, 
  onAction 
}: { 
  request: ServiceRequest | null
  onAction: (requestId: string, action: string) => void
}) {
  if (!request) return null

  return (
    <div className="space-y-6">
      {/* Request Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Request Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Request Number:</span>
              <span className="font-mono">{request.requestNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Department:</span>
              <span>{request.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Requested By:</span>
              <span>{request.requestedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span>{request.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span>{request.status}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Request Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            {request.approvedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Approved:</span>
                <span>{format(new Date(request.approvedAt), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Total Items:</span>
              <span>{request.itemsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unique Parts:</span>
              <span>{request.uniqueItemsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Est. Value:</span>
              <span className="font-medium">${request.estimatedValue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Request Items */}
      <div>
        <h4 className="font-medium mb-3">Requested Items</h4>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 grid grid-cols-12 gap-2 text-sm font-medium text-gray-600">
            <div className="col-span-1">Qty</div>
            <div className="col-span-3">Assembly ID</div>
            <div className="col-span-4">Assembly Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Price</div>
          </div>
          {request.items.map((item, index) => (
            <div key={item.id} className={`px-4 py-3 grid grid-cols-12 gap-2 text-sm ${
              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            }`}>
              <div className="col-span-1 font-medium">{item.quantity}</div>
              <div className="col-span-3 font-mono text-xs">{item.assemblyId}</div>
              <div className="col-span-4">{item.assemblyName}</div>
              <div className="col-span-2">
                <Badge variant="outline" className="text-xs">
                  {item.assemblyType}
                </Badge>
              </div>
              <div className="col-span-2 text-right">
                {item.unitPrice ? `$${item.totalPrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Request Notes */}
      {request.notes && (
        <div>
          <h4 className="font-medium mb-2">Notes</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            {request.notes}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        {request.status === 'APPROVED' && (
          <Button
            onClick={() => onAction(request.id, 'start_fulfillment')}
            className="flex-1"
          >
            Start Fulfillment
          </Button>
        )}
        {request.status === 'IN_PROGRESS' && (
          <Button
            onClick={() => onAction(request.id, 'mark_fulfilled')}
            className="flex-1"
          >
            Mark as Fulfilled
          </Button>
        )}
      </div>
    </div>
  )
}