"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { nextJsApiClient } from "@/lib/api"
import {
  Package,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  Truck,
} from "lucide-react"
import { format } from "date-fns"

interface Order {
  id: string
  poNumber: string
  customerName: string
  projectName?: string
  wantDate: string
  orderStatus: string
  buildNumbers: string[]
  createdAt: string
  createdBy: { fullName: string }
}

interface ProcurementItem {
  id: string
  partNumber: string
  partName: string
  quantity: number
  category: "LEGS" | "FEET"
  status?: "PENDING" | "SENT" | "RECEIVED"
}

interface BOMItem {
  assemblyId: string
  name: string
  quantity: number
  partNumber?: string
  id?: string
  children?: BOMItem[]
}

interface ComprehensiveOrderViewProps {
  orderId: string
}

// Part number patterns for legs and feet/casters (procurement specific)
const LEGS_PATTERNS = [
  "T2-DL27-KIT",
  "T2-DL14-KIT", 
  "T2-LC1-KIT",
  "T2-DL27-FH-KIT",
  "T2-DL14-FH-KIT",
]

const FEET_PATTERNS = [
  "T2-LEVELING-CASTOR-475",
  "T2-SEISMIC-FEET",
]

export function ComprehensiveOrderView({ orderId }: ComprehensiveOrderViewProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadOrderData()
  }, [orderId])

  const loadOrderData = async () => {
    try {
      setLoading(true)
      
      // Load order details
      const orderResponse = await nextJsApiClient.get(`/orders/${orderId}`)
      if (orderResponse.data.success) {
        setOrder(orderResponse.data.data)
      }

      // Load BOM data
      const bomResponse = await nextJsApiClient.get(`/orders/${orderId}/source-of-truth`)
      if (bomResponse.data.success) {
        const bomData = bomResponse.data.data?.billOfMaterials?.flattened || []
        setBomItems(bomData)
        
        // Extract procurement items from BOM
        const procurement = extractProcurementItems(bomData)
        setProcurementItems(procurement)
      }

    } catch (error) {
      console.error("Error loading order data:", error)
      toast({
        title: "Error",
        description: "Failed to load order data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const extractProcurementItems = (bomItems: BOMItem[]): ProcurementItem[] => {
    const items: ProcurementItem[] = []
    
    bomItems.forEach((item, index) => {
      const partNumber = item.assemblyId || item.partNumber || item.id || ""
      const isLeg = LEGS_PATTERNS.includes(partNumber)
      const isFoot = FEET_PATTERNS.includes(partNumber)
      
      if (isLeg || isFoot) {
        items.push({
          id: `${item.assemblyId || item.id}-${index}`,
          partNumber,
          partName: item.name,
          quantity: item.quantity,
          category: isLeg ? "LEGS" : "FEET",
          status: "PENDING"
        })
      }
    })
    
    return items
  }

  const getWorkflowStep = () => {
    if (!order) return 0
    
    switch (order.orderStatus) {
      case "ORDER_CREATED":
        return 1
      case "SINK_BODY_EXTERNAL_PRODUCTION":
        return 2
      case "READY_FOR_PRE_QC":
        return 3
      default:
        return 0
    }
  }

  const handleSendParts = async () => {
    if (selectedItems.size === 0) {
      // Auto-select all items if none selected
      setSelectedItems(new Set(procurementItems.map(item => item.id)))
      return
    }

    setActionLoading(true)
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

      // Update order status
      await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "SINK_BODY_EXTERNAL_PRODUCTION",
        notes: `Procurement sent ${selectedPartsData.length} parts to sink body manufacturer: ${selectedPartsData.map(p => p.partNumber).join(", ")}`,
      })

      toast({
        title: "Parts Sent Successfully",
        description: `${selectedPartsData.length} parts have been sent to the sink body manufacturer`,
      })

      // Reload data
      loadOrderData()
      setSelectedItems(new Set())
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send parts to manufacturer",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkSinkBodyReceived = async () => {
    setActionLoading(true)
    try {
      // Update order status to READY_FOR_PRE_QC
      await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "READY_FOR_PRE_QC",
        notes: "Sink body received from manufacturer - ready for Pre-QC",
      })

      toast({
        title: "Sink Body Received",
        description: "Order status updated to Ready for Pre-QC",
      })

      // Reload data
      loadOrderData()
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
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

  const currentStep = getWorkflowStep()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span>Loading order details...</span>
      </div>
    )
  }

  if (!order) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Order not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{order.poNumber}</CardTitle>
              <CardDescription className="text-lg">
                {order.customerName}
                {order.projectName && ` • ${order.projectName}`}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Due Date</div>
              <div className="font-medium">
                {format(new Date(order.wantDate), "MMM dd, yyyy")}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Procurement Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? "text-blue-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
                1
              </div>
              <span className="font-medium">Order Created</span>
            </div>
            
            <ArrowRight className="text-gray-400" />
            
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? "text-purple-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? "bg-purple-600 text-white" : "bg-gray-200"}`}>
                2
              </div>
              <span className="font-medium">Parts Sent</span>
            </div>
            
            <ArrowRight className="text-gray-400" />
            
            <div className={`flex items-center gap-2 ${currentStep >= 3 ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? "bg-green-600 text-white" : "bg-gray-200"}`}>
                3
              </div>
              <span className="font-medium">Sink Body Received</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Procurement Items */}
      <Card>
        <CardHeader>
          <CardTitle>Legs & Casters for External Manufacturing</CardTitle>
          <CardDescription>
            Parts that need to be sent to the sink body manufacturer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {procurementItems.length === 0 ? (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                No legs or casters found in the BOM for this order.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Items List */}
              <div className="space-y-3">
                {procurementItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedItems.has(item.id) ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                    }`}
                    onClick={() => currentStep === 1 && handleItemToggle(item.id)}
                  >
                    <div className="flex items-center gap-4">
                      {currentStep === 1 && (
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleItemToggle(item.id)}
                          className="rounded"
                        />
                      )}
                      <Package className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{item.partNumber}</div>
                        <div className="text-sm text-gray-600">{item.partName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={item.category === "LEGS" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
                        {item.category}
                      </Badge>
                      <span className="font-medium">Qty: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t">
                {currentStep === 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {selectedItems.size > 0 ? `${selectedItems.size} items selected` : "Click items to select them"}
                    </div>
                    <Button
                      onClick={handleSendParts}
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send {selectedItems.size > 0 ? selectedItems.size : "All"} Parts to Manufacturer
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-medium text-purple-800">Parts sent to manufacturer</div>
                      <div className="text-sm text-purple-600">Waiting for sink body with assembled legs to arrive</div>
                    </div>
                    <Button
                      onClick={handleMarkSinkBodyReceived}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Sink Body Received
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {currentStep === 3 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Sink body has been received and the order is ready for Pre-QC.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Build Numbers</div>
              <div className="font-medium">{order.buildNumbers.join(", ")}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="font-medium">{format(new Date(order.createdAt), "MMM dd, yyyy")}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created By</div>
              <div className="font-medium">{order.createdBy.fullName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Current Status</div>
              <Badge className={
                order.orderStatus === "ORDER_CREATED" ? "bg-blue-100 text-blue-700" :
                order.orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION" ? "bg-purple-100 text-purple-700" :
                "bg-green-100 text-green-700"
              }>
                {order.orderStatus === "ORDER_CREATED" ? "New Order" :
                 order.orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION" ? "Parts Sent" :
                 "Ready for QC"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}