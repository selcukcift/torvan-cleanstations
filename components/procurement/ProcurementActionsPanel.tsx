"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { nextJsApiClient } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Package,
  Send,
  CheckCircle,
  Loader2,
  TruckIcon,
  AlertCircle,
} from "lucide-react"

interface ProcurementActionsPanelProps {
  orderId: string
  orderStatus: string
  procurementItems: Array<{
    id: string
    partNumber: string
    partName: string
    quantity: number
    category: "LEGS" | "FEET"
    status?: "PENDING" | "SENT" | "RECEIVED"
  }>
  onStatusChange?: () => void
}

export function ProcurementActionsPanel({
  orderId,
  orderStatus,
  procurementItems,
  onStatusChange,
}: ProcurementActionsPanelProps) {
  const { toast } = useToast()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const canTakeAction = ["ORDER_CREATED", "SINK_BODY_EXTERNAL_PRODUCTION"].includes(orderStatus)
  const hasItems = procurementItems.length > 0
  const unsentItems = procurementItems.filter(item => !item.status || item.status === "PENDING")
  const sentItems = procurementItems.filter(item => item.status === "SENT")
  const receivedItems = procurementItems.filter(item => item.status === "RECEIVED")

  const handleSelectAll = () => {
    if (selectedItems.size === unsentItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(unsentItems.map(item => item.id)))
    }
  }

  const handleItemToggle = (itemId: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  const handleSendToManufacturer = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to send to the manufacturer",
        variant: "destructive",
      })
      return
    }
    setShowConfirmDialog(true)
  }

  const confirmSendToManufacturer = async () => {
    setLoading(true)
    try {
      const selectedPartsData = procurementItems.filter(item => selectedItems.has(item.id))
      
      // Create outsourced part records
      const promises = selectedPartsData.map(item => 
        nextJsApiClient.post(`/orders/${orderId}/outsourced-parts`, {
          partNumber: item.partNumber,
          partName: item.partName,
          quantity: item.quantity,
          supplier: "Sink Body Manufacturer",
          notes: `${item.category === "LEGS" ? "Legs kit" : "Casters/Feet"} sent to sink body manufacturer`,
        })
      )

      await Promise.all(promises)

      // Update order status if it's still ORDER_CREATED
      if (orderStatus === "ORDER_CREATED") {
        await nextJsApiClient.put(`/orders/${orderId}/status`, {
          newStatus: "SINK_BODY_EXTERNAL_PRODUCTION",
          notes: `Procurement sent ${selectedPartsData.length} parts to sink body manufacturer: ${selectedPartsData.map(p => p.partNumber).join(", ")}`,
        })
        
        // Update Single Source of Truth milestone
        try {
          await nextJsApiClient.patch(`/orders/${orderId}/source-of-truth`, {
            stage: "PROCUREMENT_STARTED",
            additionalData: {
              procurement: {
                partsSent: selectedPartsData.length,
                sentAt: new Date().toISOString(),
                sentBy: "Current User" // You might want to get actual user data
              }
            }
          })
        } catch (error) {
          console.log('Failed to update Single Source of Truth:', error)
        }
      }

      toast({
        title: "Parts Sent Successfully",
        description: `${selectedPartsData.length} parts have been marked as sent to the sink body manufacturer`,
      })

      // Reset state
      setSelectedItems(new Set())
      setShowConfirmDialog(false)
      
      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send parts to manufacturer",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsReceived = async () => {
    try {
      setLoading(true)
      
      // Update order status to READY_FOR_PRE_QC
      await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "READY_FOR_PRE_QC",
        notes: "All parts received from sink body manufacturer - ready for Pre-QC",
      })

      toast({
        title: "Parts Received",
        description: "Order status updated to Ready for Pre-QC",
      })

      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!canTakeAction) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Procurement actions are not available for this order status.
        </AlertDescription>
      </Alert>
    )
  }

  if (!hasItems) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          No legs or casters found in the BOM for this order.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Procurement Actions</CardTitle>
              <CardDescription>
                Manage legs and casters for sink body manufacturer
              </CardDescription>
            </div>
            {orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION" && (
              <Badge className="bg-purple-100 text-purple-700">
                <TruckIcon className="w-4 h-4 mr-1" />
                Parts Sent
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-700">{unsentItems.length}</div>
              <div className="text-sm text-slate-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sentItems.length}</div>
              <div className="text-sm text-slate-500">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{receivedItems.length}</div>
              <div className="text-sm text-slate-500">Received</div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {orderStatus === "ORDER_CREATED" && unsentItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">{selectedItems.size} of {unsentItems.length} items selected</span>
                  {unsentItems.length > 0 && (
                    <button
                      onClick={handleSelectAll}
                      className="ml-2 text-purple-600 hover:text-purple-800 underline"
                    >
                      {selectedItems.size === unsentItems.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSendToManufacturer}
                  disabled={selectedItems.size === 0 || loading}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Manufacturer
                </Button>
              </div>
            )}

            {orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION" && sentItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">All parts sent to manufacturer</span>
                  <p className="text-slate-600">Mark sink body as received when it arrives with assembled legs</p>
                </div>
                <Button
                  onClick={handleMarkAsReceived}
                  disabled={loading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Sink Body Received
                </Button>
              </div>
            )}

            {receivedItems.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All parts have been received and the order is ready for Pre-QC.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Parts Shipment</DialogTitle>
            <DialogDescription>
              Send the selected parts to the sink body manufacturer for assembly?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Parts:</p>
              <ul className="text-sm space-y-1">
                {procurementItems
                  .filter(item => selectedItems.has(item.id))
                  .map(item => (
                    <li key={item.id}>
                      • {item.partNumber} - {item.partName} (Qty: {item.quantity})
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSendToManufacturer} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Confirm & Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}