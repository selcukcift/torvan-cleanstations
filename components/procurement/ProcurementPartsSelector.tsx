"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { nextJsApiClient } from "@/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  AlertCircle,
  CheckCircle,
  Loader2,
  TruckIcon,
} from "lucide-react"
import { format } from "date-fns"

interface ProcurementPartsSelectorProps {
  orderId: string
  bomData: any
  orderStatus: string
  onStatusChange?: () => void
}

interface SelectablePart {
  id: string
  partNumber: string
  name: string
  quantity: number
  type: "legs" | "feet" | "other"
  isOutsourced?: boolean
  outsourcedStatus?: string
  children?: any[]
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

export function ProcurementPartsSelector({
  orderId,
  bomData,
  orderStatus,
  onStatusChange,
}: ProcurementPartsSelectorProps) {
  const { toast } = useToast()
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set())
  const [selectableParts, setSelectableParts] = useState<SelectablePart[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [notes, setNotes] = useState("")
  const [outsourcedParts, setOutsourcedParts] = useState<any[]>([])
  const [loadingOutsourced, setLoadingOutsourced] = useState(true)

  useEffect(() => {
    if (bomData) {
      extractSelectableParts()
    }
    fetchOutsourcedParts()
  }, [bomData])

  // Re-extract parts when outsourced parts change
  useEffect(() => {
    if (bomData && outsourcedParts.length >= 0) {
      extractSelectableParts()
    }
  }, [outsourcedParts])

  const fetchOutsourcedParts = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}/outsourced-parts`)
      if (response.data.success) {
        setOutsourcedParts(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching outsourced parts:", error)
    } finally {
      setLoadingOutsourced(false)
    }
  }

  const extractSelectableParts = () => {
    if (!bomData) return

    const parts: SelectablePart[] = []
    
    // Function to recursively search through BOM items
    const searchBOMItems = (items: any[]) => {
      items.forEach(item => {
        const partNumber = item.id || item.assemblyId || item.partNumber || item.partIdOrAssemblyId || ""
        const isLeg = LEGS_PATTERNS.includes(partNumber)
        const isFoot = FEET_PATTERNS.includes(partNumber)
        
        if (isLeg || isFoot) {
          // Check if already outsourced
          const outsourced = outsourcedParts.find(op => op.partNumber === partNumber)
          
          parts.push({
            id: item.id || partNumber,
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

    // Handle different BOM data structures
    if (bomData.bom?.hierarchical) {
      searchBOMItems(bomData.bom.hierarchical)
    } else if (bomData.buildBOMs) {
      // Multi-build order
      Object.values(bomData.buildBOMs).forEach((buildBom: any) => {
        if (buildBom.hierarchical) {
          searchBOMItems(buildBom.hierarchical)
        }
      })
    } else if (bomData.items) {
      searchBOMItems(bomData.items)
    } else if (Array.isArray(bomData)) {
      searchBOMItems(bomData)
    }

    setSelectableParts(parts)
  }

  const handlePartSelection = (partId: string) => {
    const newSelection = new Set(selectedParts)
    if (newSelection.has(partId)) {
      newSelection.delete(partId)
    } else {
      newSelection.add(partId)
    }
    setSelectedParts(newSelection)
  }

  const handleSelectAll = (type: "legs" | "feet") => {
    const partsOfType = selectableParts.filter(p => p.type === type && !p.isOutsourced)
    const allSelected = partsOfType.every(p => selectedParts.has(p.id))
    
    const newSelection = new Set(selectedParts)
    partsOfType.forEach(part => {
      if (allSelected) {
        newSelection.delete(part.id)
      } else {
        newSelection.add(part.id)
      }
    })
    setSelectedParts(newSelection)
  }

  const handleSendToManufacturer = async () => {
    if (selectedParts.size === 0) {
      toast({
        title: "No parts selected",
        description: "Please select at least one part to send to the manufacturer",
        variant: "destructive",
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmSendToManufacturer = async () => {
    setLoading(true)
    try {
      // Create outsourced part records for each selected part
      const selectedPartsData = selectableParts.filter(p => selectedParts.has(p.id))
      
      const promises = selectedPartsData.map(part => 
        nextJsApiClient.post(`/orders/${orderId}/outsourced-parts`, {
          partNumber: part.partNumber,
          partName: part.name,
          quantity: part.quantity,
          supplier: "Sink Body Manufacturer",
          notes: notes || `${part.type === "legs" ? "Legs kit" : "Casters/Feet"} sent to sink body manufacturer`,
          // Note: status is set to "PENDING" by default in the backend, can be updated later
        })
      )

      await Promise.all(promises)

      // Update order status if it's still ORDER_CREATED
      if (orderStatus === "ORDER_CREATED") {
        await nextJsApiClient.put(`/orders/${orderId}/status`, {
          newStatus: "SINK_BODY_EXTERNAL_PRODUCTION",
          notes: `Procurement sent ${selectedPartsData.length} parts to sink body manufacturer: ${selectedPartsData.map(p => p.partNumber).join(", ")}`,
        })
      }

      toast({
        title: "Parts Sent Successfully",
        description: `${selectedPartsData.length} parts have been marked as sent to the sink body manufacturer`,
      })

      // Reset state
      setSelectedParts(new Set())
      setNotes("")
      setShowConfirmDialog(false)
      
      // Refresh data
      await fetchOutsourcedParts()
      // extractSelectableParts() will be called automatically by useEffect when outsourcedParts updates
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

  if (loadingOutsourced) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const legsParts = selectableParts.filter(p => p.type === "legs")
  const feetParts = selectableParts.filter(p => p.type === "feet")
  const hasSelectableParts = selectableParts.some(p => !p.isOutsourced)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Send Parts to Sink Body Manufacturer</CardTitle>
              <CardDescription>
                Select legs kits and casters to send to the external sink body manufacturer
              </CardDescription>
            </div>
            {orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION" && (
              <Badge className="bg-purple-100 text-purple-700">
                <TruckIcon className="w-4 h-4 mr-1" />
                Parts Already Sent
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectableParts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No legs or casters found in the BOM for this order.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Legs Section */}
              {legsParts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Legs Kits</h4>
                    {legsParts.some(p => !p.isOutsourced) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll("legs")}
                      >
                        Select All Legs
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {legsParts.map(part => (
                      <Card key={part.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedParts.has(part.id)}
                              onCheckedChange={() => handlePartSelection(part.id)}
                              disabled={part.isOutsourced}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{part.partNumber}</span>
                                <Badge variant="outline">Kit</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{part.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Qty: {part.quantity}</p>
                            {part.isOutsourced ? (
                              getStatusBadge(part.outsourcedStatus!)
                            ) : (
                              <span className="text-sm text-muted-foreground">Not sent</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Show child components */}
                        {part.children && part.children.length > 0 && (
                          <div className="ml-6 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-600 mb-2">Kit Components:</p>
                            <div className="space-y-1">
                              {part.children.map((child: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                    <span className="font-mono text-xs">{child.partNumber || child.assemblyId}</span>
                                    <span className="text-gray-600">{child.name || child.description}</span>
                                  </div>
                                  <span className="text-xs text-gray-500">Qty: {child.quantity || 1}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Feet/Casters Section */}
              {feetParts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Casters / Feet</h4>
                    {feetParts.some(p => !p.isOutsourced) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll("feet")}
                      >
                        Select All Casters
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {feetParts.map(part => (
                      <Card key={part.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedParts.has(part.id)}
                              onCheckedChange={() => handlePartSelection(part.id)}
                              disabled={part.isOutsourced}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{part.partNumber}</span>
                                <Badge variant="outline">{part.type === "feet" ? "Casters/Feet" : "Kit"}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{part.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Qty: {part.quantity}</p>
                            {part.isOutsourced ? (
                              getStatusBadge(part.outsourcedStatus!)
                            ) : (
                              <span className="text-sm text-muted-foreground">Not sent</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Show child components */}
                        {part.children && part.children.length > 0 && (
                          <div className="ml-6 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-600 mb-2">Components:</p>
                            <div className="space-y-1">
                              {part.children.map((child: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                    <span className="font-mono text-xs">{child.partNumber || child.assemblyId}</span>
                                    <span className="text-gray-600">{child.name || child.description}</span>
                                  </div>
                                  <span className="text-xs text-gray-500">Qty: {child.quantity || 1}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {hasSelectableParts && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedParts.size > 0 ? (
                      <span>{selectedParts.size} parts selected</span>
                    ) : (
                      <span>Select parts to send to manufacturer</span>
                    )}
                  </div>
                  <Button
                    onClick={handleSendToManufacturer}
                    disabled={selectedParts.size === 0 || loading}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Sink Manufacturer
                  </Button>
                </div>
              )}

              {!hasSelectableParts && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All legs and casters have already been sent to the manufacturer.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Parts Shipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to send the selected parts to the sink body manufacturer?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Parts:</p>
              <ul className="text-sm space-y-1">
                {selectableParts
                  .filter(p => selectedParts.has(p.id))
                  .map(part => (
                    <li key={part.id}>
                      • {part.partNumber} - {part.name} (Qty: {part.quantity})
                    </li>
                  ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or notes..."
                rows={3}
              />
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