"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { nextJsApiClient } from "@/lib/api"
import {
  ChevronDown,
  ChevronRight,
  Send,
  Package,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"

interface SelectablePart {
  id: string
  partNumber: string
  name: string
  quantity: number
  type: "legs" | "feet"
  isOutsourced?: boolean
  outsourcedStatus?: string
  children?: any[]
}

interface ExpandableProcurementRowProps {
  order: any
  selectedParts: Set<string>
  onPartSelection: (partId: string, orderId: string) => void
  onPartsUpdate: () => void
}

// Part number patterns for legs and feet/casters
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

export function ExpandableProcurementRow({
  order,
  selectedParts,
  onPartSelection,
  onPartsUpdate,
}: ExpandableProcurementRowProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [selectableParts, setSelectableParts] = useState<SelectablePart[]>([])
  const [outsourcedParts, setOutsourcedParts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [bomLoading, setBomLoading] = useState(false)

  useEffect(() => {
    if (isOpen && selectableParts.length === 0) {
      loadBOMData()
    }
  }, [isOpen])

  useEffect(() => {
    fetchOutsourcedParts()
  }, [])

  const fetchOutsourcedParts = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${order.id}/outsourced-parts`)
      if (response.data.success) {
        setOutsourcedParts(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching outsourced parts:", error)
    }
  }

  const loadBOMData = async () => {
    setBomLoading(true)
    try {
      // Read from existing BOM data (source of truth)
      const bomData = order.generatedBoms?.[0] || order.boms?.[0]
      const bomItems = bomData?.bomItems || []
      
      if (bomItems.length === 0) {
        setSelectableParts([])
        return
      }

      extractSelectableParts(bomItems)
    } catch (error) {
      console.error("Error loading BOM data:", error)
    } finally {
      setBomLoading(false)
    }
  }

  const extractSelectableParts = (bomItems: any[]) => {
    const parts: SelectablePart[] = []
    
    const searchBOMItems = (items: any[]) => {
      items.forEach(item => {
        const partNumber = item.assemblyId || item.partNumber || item.partIdOrAssemblyId || ""
        const isLeg = LEGS_PATTERNS.includes(partNumber)
        const isFoot = FEET_PATTERNS.includes(partNumber)
        
        if (isLeg || isFoot) {
          const outsourced = outsourcedParts.find(op => op.partNumber === partNumber)
          
          parts.push({
            id: `${order.id}-${item.id || partNumber}`,
            partNumber,
            name: item.name || item.description || partNumber,
            quantity: item.quantity || 1,
            type: isLeg ? "legs" : "feet",
            isOutsourced: !!outsourced,
            outsourcedStatus: outsourced?.status,
            children: item.children || item.subItems || [],
          })
        }
        
        // Recursively search children
        if (item.children && item.children.length > 0) {
          searchBOMItems(item.children)
        }
        if (item.subItems && item.subItems.length > 0) {
          searchBOMItems(item.subItems)
        }
      })
    }

    searchBOMItems(bomItems)
    setSelectableParts(parts)
  }

  const handleSendParts = async () => {
    const orderParts = selectableParts.filter(p => selectedParts.has(p.id))
    if (orderParts.length === 0) return

    setLoading(true)
    try {
      const promises = orderParts.map(part => 
        nextJsApiClient.post(`/orders/${order.id}/outsourced-parts`, {
          partNumber: part.partNumber,
          partName: part.name,
          quantity: part.quantity,
          supplier: "Sink Body Manufacturer",
          status: "SENT",
          notes: `${part.type === "legs" ? "Legs kit" : "Casters/Feet"} sent to sink body manufacturer`,
        })
      )

      await Promise.all(promises)

      // Update order status if needed
      if (order.orderStatus === "ORDER_CREATED") {
        await nextJsApiClient.put(`/orders/${order.id}/status`, {
          newStatus: "PARTS_SENT_WAITING_ARRIVAL",
          notes: `Procurement sent ${orderParts.length} parts to sink body manufacturer`,
        })
      }

      toast({
        title: "Parts Sent",
        description: `${orderParts.length} parts sent to manufacturer for order ${order.poNumber}`,
      })

      // Refresh data
      await fetchOutsourcedParts()
      onPartsUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send parts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
      SENT: { label: "Sent", className: "bg-blue-100 text-blue-700" },
      IN_PROGRESS: { label: "In Progress", className: "bg-purple-100 text-purple-700" },
      RECEIVED: { label: "Received", className: "bg-green-100 text-green-700" },
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
    }
    
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // Create summary for collapsed view
  const legsParts = selectableParts.filter(p => p.type === "legs")
  const feetParts = selectableParts.filter(p => p.type === "feet")
  const availableParts = selectableParts.filter(p => !p.isOutsourced)
  const selectedOrderParts = selectableParts.filter(p => selectedParts.has(p.id))

  const getSummaryText = () => {
    if (bomLoading) return "Loading parts..."
    if (selectableParts.length === 0 && isOpen) return "No procurement parts found"
    
    const summary = []
    if (legsParts.length > 0) summary.push(`${legsParts.length} legs kit${legsParts.length !== 1 ? 's' : ''}`)
    if (feetParts.length > 0) summary.push(`${feetParts.length} caster${feetParts.length !== 1 ? 's' : ''}`)
    
    return summary.length > 0 ? summary.join(", ") : "No parts to send"
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* Header with expand button and action button separately */}
      <div className="flex items-center gap-2">
        <CollapsibleTrigger className="flex items-center gap-2 text-left hover:bg-gray-50 p-2 rounded">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <div>
            <p className="text-sm font-medium">{getSummaryText()}</p>
            {availableParts.length > 0 && !isOpen && (
              <p className="text-xs text-muted-foreground">
                {availableParts.length} available to send
              </p>
            )}
          </div>
        </CollapsibleTrigger>
        
        {/* Send button outside of collapsible trigger */}
        {selectedOrderParts.length > 0 && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="ml-auto"
          >
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendParts}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              Send ({selectedOrderParts.length})
            </Button>
          </div>
        )}
      </div>
      
      <CollapsibleContent className="mt-2">
        {bomLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">Loading BOM data...</span>
          </div>
        ) : selectableParts.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No legs or casters found in this order's BOM
          </div>
        ) : (
          <div className="space-y-3 pl-6">
            {/* Legs Section */}
            {legsParts.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Legs Kits</h5>
                <div className="space-y-2">
                  {legsParts.map(part => (
                    <Card key={part.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedParts.has(part.id)}
                            onCheckedChange={() => onPartSelection(part.id, order.id)}
                            disabled={part.isOutsourced}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{part.partNumber}</span>
                              <Badge variant="outline">Kit</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{part.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Qty: {part.quantity}</p>
                          {part.isOutsourced ? (
                            getStatusBadge(part.outsourcedStatus!)
                          ) : (
                            <span className="text-xs text-muted-foreground">Ready to send</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Show child components */}
                      {part.children && part.children.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-600 mb-1">Components:</p>
                          <div className="grid grid-cols-1 gap-1">
                            {part.children.slice(0, 3).map((child: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-600">
                                <span>• {child.name || child.partNumber}</span>
                                <span>Qty: {child.quantity || 1}</span>
                              </div>
                            ))}
                            {part.children.length > 3 && (
                              <p className="text-xs text-gray-500">
                                + {part.children.length - 3} more components
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Feet Section */}
            {feetParts.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Casters / Feet</h5>
                <div className="space-y-2">
                  {feetParts.map(part => (
                    <Card key={part.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedParts.has(part.id)}
                            onCheckedChange={() => onPartSelection(part.id, order.id)}
                            disabled={part.isOutsourced}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{part.partNumber}</span>
                              <Badge variant="outline">Casters</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{part.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Qty: {part.quantity}</p>
                          {part.isOutsourced ? (
                            getStatusBadge(part.outsourcedStatus!)
                          ) : (
                            <span className="text-xs text-muted-foreground">Ready to send</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Show child components */}
                      {part.children && part.children.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-600 mb-1">Components:</p>
                          <div className="grid grid-cols-1 gap-1">
                            {part.children.slice(0, 3).map((child: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-600">
                                <span>• {child.name || child.partNumber}</span>
                                <span>Qty: {child.quantity || 1}</span>
                              </div>
                            ))}
                            {part.children.length > 3 && (
                              <p className="text-xs text-gray-500">
                                + {part.children.length - 3} more components
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}