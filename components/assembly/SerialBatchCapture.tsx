"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Scan, Package, AlertCircle, CheckCircle } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface SerialBatchCaptureProps {
  orderId: string
  bomItemId: string
  partId: string
  partName: string
  requiresSerialTracking?: boolean
  currentSerialNumber?: string
  currentBatchNumber?: string
  onCapture?: (data: { serialNumber?: string; batchNumber?: string }) => void
}

export function SerialBatchCapture({
  orderId,
  bomItemId,
  partId,
  partName,
  requiresSerialTracking = false,
  currentSerialNumber,
  currentBatchNumber,
  onCapture
}: SerialBatchCaptureProps) {
  const { toast } = useToast()
  const [serialNumber, setSerialNumber] = useState(currentSerialNumber || "")
  const [batchNumber, setBatchNumber] = useState(currentBatchNumber || "")
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [partDetails, setPartDetails] = useState<any>(null)

  useEffect(() => {
    fetchPartDetails()
  }, [partId])

  const fetchPartDetails = async () => {
    try {
      const response = await nextJsApiClient.get(`/parts/${partId}`)
      if (response.data.success) {
        setPartDetails(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching part details:", error)
    }
  }

  const handleSave = async () => {
    if (requiresSerialTracking && !serialNumber && !batchNumber) {
      toast({
        title: "Tracking Required",
        description: "This part requires either a serial number or batch number",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSaving(true)
      
      const response = await nextJsApiClient.patch(`/orders/${orderId}/bom/${bomItemId}`, {
        serialNumber: serialNumber || null,
        batchNumber: batchNumber || null
      })

      if (response.data.success) {
        toast({
          title: "Tracking Updated",
          description: "Serial/batch number has been recorded",
        })
        
        if (onCapture) {
          onCapture({ serialNumber, batchNumber })
        }
        
        setIsOpen(false)
      } else {
        throw new Error(response.data.error || "Failed to update tracking")
      }
    } catch (error) {
      console.error("Error saving tracking:", error)
      toast({
        title: "Error",
        description: "Failed to save tracking information",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleScan = () => {
    // Placeholder for barcode scanning functionality
    toast({
      title: "Scanner",
      description: "Barcode scanning functionality coming soon",
    })
  }

  const hasTracking = currentSerialNumber || currentBatchNumber

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={requiresSerialTracking && !hasTracking ? "destructive" : "outline"}
          size="sm"
          className="gap-2"
        >
          <Package className="h-4 w-4" />
          {hasTracking ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Tracked
            </>
          ) : (
            <>
              {requiresSerialTracking && <AlertCircle className="h-4 w-4" />}
              Track Part
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Track Component</DialogTitle>
          <DialogDescription>
            Record serial or batch numbers for traceability
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Part</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{partId}</Badge>
              <span className="text-sm text-muted-foreground">{partName}</span>
            </div>
          </div>

          {requiresSerialTracking && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This part requires serial or batch number tracking for compliance
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="serial">Serial Number</Label>
            <div className="flex gap-2">
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Enter or scan serial number"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleScan}
              >
                <Scan className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch">Batch/Lot Number</Label>
            <div className="flex gap-2">
              <Input
                id="batch"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Enter or scan batch number"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleScan}
              >
                <Scan className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {partDetails?.manufacturerName && (
            <div className="space-y-2">
              <Label className="text-sm">Manufacturer</Label>
              <p className="text-sm text-muted-foreground">{partDetails.manufacturerName}</p>
            </div>
          )}

          {(currentSerialNumber || currentBatchNumber) && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">Current Tracking</p>
              {currentSerialNumber && (
                <p className="text-sm">Serial: {currentSerialNumber}</p>
              )}
              {currentBatchNumber && (
                <p className="text-sm">Batch: {currentBatchNumber}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Tracking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}