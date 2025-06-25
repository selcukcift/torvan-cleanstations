"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Package, Clock, CheckCircle, AlertTriangle, Truck, Calendar, User } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface OutsourcedPart {
  id: string
  partId: string
  partName: string
  partNumber: string
  quantity: number
  supplier?: string
  expectedDelivery?: string
  status: 'PENDING_ORDER' | 'ORDERED' | 'IN_TRANSIT' | 'RECEIVED' | 'DELAYED' | 'CANCELLED'
  trackingNumber?: string
  notes?: string
  orderedBy?: string
  orderedDate?: string
  receivedDate?: string
}

interface OutsourcedPartsTrackerProps {
  orderId: string
  orderData: {
    poNumber: string
    customerName: string
  }
  outsourcedParts: OutsourcedPart[]
  onUpdate?: () => void
}

const STATUS_CONFIG = {
  PENDING_ORDER: { 
    label: "Pending Order", 
    variant: "outline" as const, 
    icon: Clock,
    description: "Awaiting procurement action"
  },
  ORDERED: { 
    label: "Ordered", 
    variant: "secondary" as const, 
    icon: Package,
    description: "Order placed with supplier"
  },
  IN_TRANSIT: { 
    label: "In Transit", 
    variant: "default" as const, 
    icon: Truck,
    description: "Shipped by supplier"
  },
  RECEIVED: { 
    label: "Received", 
    variant: "default" as const, 
    icon: CheckCircle,
    description: "Part received and verified"
  },
  DELAYED: { 
    label: "Delayed", 
    variant: "destructive" as const, 
    icon: AlertTriangle,
    description: "Delivery delayed by supplier"
  },
  CANCELLED: { 
    label: "Cancelled", 
    variant: "destructive" as const, 
    icon: AlertTriangle,
    description: "Order cancelled"
  }
}

export function OutsourcedPartsTracker({
  orderId,
  orderData,
  outsourcedParts,
  onUpdate
}: OutsourcedPartsTrackerProps) {
  const { toast } = useToast()
  const [selectedPart, setSelectedPart] = useState<OutsourcedPart | null>(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [updateData, setUpdateData] = useState({
    status: '',
    supplier: '',
    expectedDelivery: '',
    trackingNumber: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getPendingPartsCount = () => {
    return outsourcedParts.filter(part => 
      !['RECEIVED', 'CANCELLED'].includes(part.status)
    ).length
  }

  const getStatusIcon = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    const IconComponent = config?.icon || Package
    return <IconComponent className="h-4 w-4" />
  }

  const handleUpdatePart = (part: OutsourcedPart) => {
    setSelectedPart(part)
    setUpdateData({
      status: part.status,
      supplier: part.supplier || '',
      expectedDelivery: part.expectedDelivery || '',
      trackingNumber: part.trackingNumber || '',
      notes: part.notes || ''
    })
    setIsUpdateDialogOpen(true)
  }

  const handleSubmitUpdate = async () => {
    if (!selectedPart) return

    try {
      setIsSubmitting(true)

      const response = await nextJsApiClient.put(
        `/orders/${orderId}/outsourced-parts/${selectedPart.id}`,
        updateData
      )

      if (response.data.success) {
        toast({
          title: "Part Status Updated",
          description: `${selectedPart.partName} status updated to ${STATUS_CONFIG[updateData.status as keyof typeof STATUS_CONFIG]?.label}`,
        })

        setIsUpdateDialogOpen(false)
        setSelectedPart(null)
        onUpdate?.()
      } else {
        throw new Error(response.data.error || "Failed to update part status")
      }
    } catch (error) {
      console.error("Error updating outsourced part:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update part status",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString()
  }

  const isOrderBlocked = getPendingPartsCount() > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Outsourced Parts Tracking
          </CardTitle>
          <CardDescription>
            Monitor external supplier parts for order {orderData.poNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isOrderBlocked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Assembly Blocked</AlertTitle>
                <AlertDescription>
                  {getPendingPartsCount()} outsourced parts are still pending. 
                  Assembly cannot proceed until all external parts are received.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4">
              {outsourcedParts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No outsourced parts required for this order</p>
                </div>
              ) : (
                outsourcedParts.map((part) => {
                  const statusConfig = STATUS_CONFIG[part.status as keyof typeof STATUS_CONFIG]
                  
                  return (
                    <Card key={part.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{part.partName}</span>
                              <Badge variant="outline" className="text-xs">
                                {part.partNumber}
                              </Badge>
                              <Badge variant={statusConfig?.variant as "default" | "destructive" | "outline" | "secondary" | null | undefined} className="gap-1">
                                {getStatusIcon(part.status)}
                                {statusConfig?.label}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Quantity:</span>
                                <p className="font-medium">{part.quantity}</p>
                              </div>
                              
                              {part.supplier && (
                                <div>
                                  <span className="text-muted-foreground">Supplier:</span>
                                  <p className="font-medium">{part.supplier}</p>
                                </div>
                              )}
                              
                              {part.expectedDelivery && (
                                <div>
                                  <span className="text-muted-foreground">Expected:</span>
                                  <p className="font-medium">{formatDate(part.expectedDelivery)}</p>
                                </div>
                              )}
                              
                              {part.trackingNumber && (
                                <div>
                                  <span className="text-muted-foreground">Tracking:</span>
                                  <p className="font-medium font-mono text-xs">{part.trackingNumber}</p>
                                </div>
                              )}
                            </div>

                            {part.notes && (
                              <div className="mt-2">
                                <span className="text-muted-foreground text-xs">Notes:</span>
                                <p className="text-sm">{part.notes}</p>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdatePart(part)}
                            className="ml-4"
                          >
                            Update
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Outsourced Part</DialogTitle>
            <DialogDescription>
              Update status and tracking information for {selectedPart?.partName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={updateData.status} onValueChange={(value) => setUpdateData(prev => ({...prev, status: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={updateData.supplier}
                onChange={(e) => setUpdateData(prev => ({...prev, supplier: e.target.value}))}
                placeholder="Supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={updateData.expectedDelivery}
                onChange={(e) => setUpdateData(prev => ({...prev, expectedDelivery: e.target.value}))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={updateData.trackingNumber}
                onChange={(e) => setUpdateData(prev => ({...prev, trackingNumber: e.target.value}))}
                placeholder="Carrier tracking number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={updateData.notes}
                onChange={(e) => setUpdateData(prev => ({...prev, notes: e.target.value}))}
                placeholder="Additional notes or updates"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6">
            <Button
              variant="outline"
              onClick={() => setIsUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpdate}
              disabled={isSubmitting || !updateData.status}
            >
              {isSubmitting ? "Updating..." : "Update Part"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}