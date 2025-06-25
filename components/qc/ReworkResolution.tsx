"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, Wrench, ArrowRight, RefreshCw, AlertCircle, Camera } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { format } from "date-fns"

interface ReworkResolutionProps {
  orderId: string
  orderData: {
    poNumber: string
    customerName: string
    orderStatus: string
  }
  rejectionData?: {
    qcResultId: string
    rejectionReason: string
    detailedNotes: string
    correctiveActions?: string
    qcTimestamp: string
    rejectedBy: string
  }
  onResolution?: () => void
}

export function ReworkResolution({
  orderId,
  orderData,
  rejectionData,
  onResolution
}: ReworkResolutionProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [photosAttached, setPhotosAttached] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitResolution = async () => {
    if (!resolutionNotes.trim()) {
      toast({
        title: "Validation Error",
        description: "Please describe the corrective actions taken",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const resolutionData = {
        resolutionNotes,
        photosAttached,
        resolvedBy: sessionStorage.getItem('userName') || 'Unknown User',
        resolvedAt: new Date().toISOString()
      }

      const response = await nextJsApiClient.post(`/orders/${orderId}/rework/resolve`, resolutionData)

      if (response.data.success) {
        const nextStatus = orderData.orderStatus.includes('PRE_QC') 
          ? 'READY_FOR_PRE_QC' 
          : 'READY_FOR_FINAL_QC'
        
        toast({
          title: "Rework Completed",
          description: `Rework has been marked as completed. Order moved to ${nextStatus} status for re-inspection.`,
        })

        setIsOpen(false)
        onResolution?.()
      } else {
        throw new Error(response.data.error || "Failed to submit resolution")
      }
    } catch (error) {
      console.error("Error submitting rework resolution:", error)
      toast({
        title: "Error",
        description: "Failed to submit rework resolution",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isReworkStatus = orderData.orderStatus.includes('ASSEMBLY_REWORK')

  if (!isReworkStatus) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CheckCircle className="h-4 w-4" />
          Complete Rework
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Complete Assembly Rework
          </DialogTitle>
          <DialogDescription>
            Mark the assembly rework as completed and ready for re-inspection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline">{orderData.poNumber}</Badge>
                <span className="ml-2 text-sm text-muted-foreground">{orderData.customerName}</span>
              </div>
              <Badge variant="destructive">{orderData.orderStatus}</Badge>
            </div>
          </div>

          {rejectionData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Original QC Rejection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Rejection Reason</p>
                  <p className="text-sm text-muted-foreground">{rejectionData.rejectionReason}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Details</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rejectionData.detailedNotes}</p>
                </div>

                {rejectionData.correctiveActions && (
                  <div>
                    <p className="text-sm font-medium">Recommended Actions</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rejectionData.correctiveActions}</p>
                  </div>
                )}

                <Separator />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Rejected by: {rejectionData.rejectedBy}</span>
                  <span>{format(new Date(rejectionData.qcTimestamp), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Rework Completion</AlertTitle>
            <AlertDescription>
              Completing this rework will move the order back to QC queue for re-inspection. 
              Ensure all identified issues have been resolved before submitting.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution Description *</label>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe the specific corrective actions taken to address the QC rejection issues..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Photo Documentation</label>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                toast({
                  title: "Photo Upload",
                  description: "Photo upload functionality coming soon",
                })
              }}
            >
              <Camera className="h-4 w-4" />
              Attach Photos
            </Button>
            <p className="text-xs text-muted-foreground">
              Attach photos showing the completed rework (optional but recommended)
            </p>
          </div>

          <Alert>
            <ArrowRight className="h-4 w-4" />
            <AlertDescription>
              Next Step: Order will be moved to <strong>
                {orderData.orderStatus.includes('PRE_QC') ? 'READY_FOR_PRE_QC' : 'READY_FOR_FINAL_QC'}
              </strong> status for QC re-inspection.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitResolution}
            disabled={isSubmitting || !resolutionNotes.trim()}
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Rework
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}