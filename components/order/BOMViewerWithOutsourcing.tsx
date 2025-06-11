"use client"

import { useState, useEffect } from "react"
import { BOMViewer } from "./BOMViewer"
import { OutsourcingDialog } from "@/components/procurement/OutsourcingDialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { nextJsApiClient } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Package,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react"

interface OutsourcedPart {
  id: string
  bomItemId?: string
  partNumber: string
  partName: string
  quantity: number
  supplier?: string
  status: string
  notes?: string
  expectedReturnDate?: string
  actualReturnDate?: string
  markedBy?: {
    fullName: string
    email: string
  }
  markedAt: string
}

interface BOMViewerWithOutsourcingProps {
  orderId: string
  poNumber?: string
  bomData?: any
  onExport?: (format: 'csv' | 'pdf') => void
  allowOutsourcing?: boolean
}

const statusConfig = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  IN_PROGRESS: { label: "In Progress", color: "bg-purple-100 text-purple-700", icon: Package },
  RECEIVED: { label: "Received", color: "bg-green-100 text-green-700", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: AlertCircle },
}

export function BOMViewerWithOutsourcing({
  orderId,
  poNumber,
  bomData,
  onExport,
  allowOutsourcing = false,
}: BOMViewerWithOutsourcingProps) {
  const { toast } = useToast()
  const [outsourcingMode, setOutsourcingMode] = useState(false)
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set())
  const [outsourcedParts, setOutsourcedParts] = useState<OutsourcedPart[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedPart, setSelectedPart] = useState<any>(null)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")

  // Fetch outsourced parts for this order
  useEffect(() => {
    if (orderId && allowOutsourcing) {
      fetchOutsourcedParts()
    }
  }, [orderId, allowOutsourcing])

  const fetchOutsourcedParts = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}/outsourced-parts`)
      if (response.data.success) {
        setOutsourcedParts(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching outsourced parts:", error)
    }
  }

  const handlePartSelection = (partId: string, partData: any) => {
    if (!outsourcingMode) return

    const newSelection = new Set(selectedParts)
    if (newSelection.has(partId)) {
      newSelection.delete(partId)
    } else {
      newSelection.add(partId)
    }
    setSelectedParts(newSelection)
  }

  const handleMarkForOutsourcing = async () => {
    if (selectedParts.size === 0) {
      toast({
        title: "No parts selected",
        description: "Please select at least one part to mark for outsourcing",
        variant: "destructive",
      })
      return
    }

    // For now, we'll handle single part selection
    // In a real implementation, we'd handle bulk operations
    const partId = Array.from(selectedParts)[0]
    const partData = findPartInBOM(partId, bomData)

    if (partData) {
      setSelectedPart(partData)
      setDialogMode("create")
      setShowDialog(true)
    }
  }

  const findPartInBOM = (partId: string, items: any[]): any => {
    for (const item of items) {
      if (item.id === partId || item.partIdOrAssemblyId === partId) {
        return item
      }
      if (item.children || item.subItems) {
        const found = findPartInBOM(partId, item.children || item.subItems)
        if (found) return found
      }
    }
    return null
  }

  const handleSaveOutsourcing = async (data: any) => {
    setLoading(true)
    try {
      if (dialogMode === "create") {
        const response = await nextJsApiClient.post(
          `/orders/${orderId}/outsourced-parts`,
          data
        )
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Part marked for outsourcing",
          })
          setSelectedParts(new Set())
          await fetchOutsourcedParts()
        }
      } else {
        const response = await nextJsApiClient.put(
          `/orders/${orderId}/outsourced-parts?id=${data.id}`,
          data
        )
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Outsourcing details updated",
          })
          await fetchOutsourcedParts()
        }
      }
      setShowDialog(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to save outsourcing details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditOutsourcing = (part: OutsourcedPart) => {
    setSelectedPart(part)
    setDialogMode("edit")
    setShowDialog(true)
  }

  const isPartOutsourced = (partNumber: string) => {
    return outsourcedParts.some((p) => p.partNumber === partNumber)
  }

  const getOutsourcedPartStatus = (partNumber: string) => {
    const part = outsourcedParts.find((p) => p.partNumber === partNumber)
    return part ? part.status : null
  }

  // Enhanced BOM rendering with outsourcing indicators
  const renderBOMWithOutsourcing = () => {
    if (!bomData || !bomData.items) return null

    const renderItem = (item: any, level: number = 0) => {
      const isOutsourced = isPartOutsourced(item.partIdOrAssemblyId || item.partNumber)
      const outsourcedStatus = getOutsourcedPartStatus(item.partIdOrAssemblyId || item.partNumber)
      const outsourcedPart = outsourcedParts.find(
        (p) => p.partNumber === (item.partIdOrAssemblyId || item.partNumber)
      )

      return (
        <div
          key={item.id || item.partIdOrAssemblyId}
          className={cn(
            "border-b last:border-b-0 py-2",
            level > 0 && "ml-6"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {outsourcingMode && allowOutsourcing && (
                <Checkbox
                  checked={selectedParts.has(item.id || item.partIdOrAssemblyId)}
                  onCheckedChange={() =>
                    handlePartSelection(item.id || item.partIdOrAssemblyId, item)
                  }
                  disabled={isOutsourced}
                />
              )}
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({item.partIdOrAssemblyId || item.partNumber})
                </span>
                {isOutsourced && outsourcedStatus && (
                  <Badge
                    className={cn(
                      "ml-2",
                      statusConfig[outsourcedStatus as keyof typeof statusConfig].color
                    )}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {statusConfig[outsourcedStatus as keyof typeof statusConfig].label}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Qty: {item.quantity}</span>
              {isOutsourced && outsourcedPart && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditOutsourcing(outsourcedPart)}
                >
                  Details
                </Button>
              )}
            </div>
          </div>
          {item.children &&
            item.children.map((child: any) => renderItem(child, level + 1))}
        </div>
      )
    }

    return bomData.items.map((item: any) => renderItem(item))
  }

  if (!allowOutsourcing) {
    // If outsourcing is not allowed, just render the standard BOM viewer
    return <BOMViewer orderId={orderId} poNumber={poNumber} bomData={bomData} onExport={onExport} />
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bill of Materials</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="outsourcing-mode"
                  checked={outsourcingMode}
                  onCheckedChange={setOutsourcingMode}
                />
                <Label htmlFor="outsourcing-mode">Outsourcing Mode</Label>
              </div>
              {outsourcingMode && (
                <Button
                  size="sm"
                  onClick={handleMarkForOutsourcing}
                  disabled={selectedParts.size === 0}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Mark for Outsourcing ({selectedParts.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {outsourcedParts.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {outsourcedParts.length} parts are marked for outsourcing in this order
              </AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {renderBOMWithOutsourcing()}
            </div>
          )}
        </CardContent>
      </Card>

      <OutsourcingDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        part={selectedPart}
        mode={dialogMode}
        onSave={handleSaveOutsourcing}
        loading={loading}
      />
    </>
  )
}