"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { XCircle, AlertTriangle, ArrowLeft, Send, CheckCircle2 } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface QCRejectionWorkflowProps {
  orderId: string
  orderData: {
    poNumber: string
    customerName: string
    status: string
  }
  qcType: 'PRE_QC' | 'FINAL_QC'
  onReject?: () => void
  onCancel?: () => void
}

interface RejectionReason {
  category: string
  description: string
  requiresAssemblyRework: boolean
  severity: 'minor' | 'major' | 'critical'
}

const REJECTION_REASONS: RejectionReason[] = [
  {
    category: "Dimensional Issues",
    description: "Measurements do not match specifications",
    requiresAssemblyRework: true,
    severity: "major"
  },
  {
    category: "Surface Defects",
    description: "Scratches, dents, or finish issues",
    requiresAssemblyRework: true,
    severity: "minor"
  },
  {
    category: "Assembly Gaps",
    description: "Poor fit between components",
    requiresAssemblyRework: true,
    severity: "major"
  },
  {
    category: "Component Missing",
    description: "Required component not installed",
    requiresAssemblyRework: true,
    severity: "critical"
  },
  {
    category: "Component Misaligned",
    description: "Components not properly aligned",
    requiresAssemblyRework: true,
    severity: "major"
  },
  {
    category: "Electrical Issues",
    description: "Wiring or electrical components faulty",
    requiresAssemblyRework: true,
    severity: "critical"
  },
  {
    category: "Plumbing Issues",
    description: "Leaks or plumbing installation problems",
    requiresAssemblyRework: true,
    severity: "critical"
  },
  {
    category: "Documentation Missing",
    description: "Required documentation not attached",
    requiresAssemblyRework: false,
    severity: "minor"
  },
  {
    category: "Cleanliness Issues",
    description: "Unit not properly cleaned",
    requiresAssemblyRework: false,
    severity: "minor"
  },
  {
    category: "Other",
    description: "Other issues not listed above",
    requiresAssemblyRework: false,
    severity: "major"
  }
]

export function QCRejectionWorkflow({
  orderId,
  orderData,
  qcType,
  onReject,
  onCancel
}: QCRejectionWorkflowProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(null)
  const [detailedNotes, setDetailedNotes] = useState("")
  const [correctiveActions, setCorrectiveActions] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReasonSelect = (reasonIndex: string) => {
    const reason = REJECTION_REASONS[parseInt(reasonIndex)]
    setSelectedReason(reason)
  }

  const handleSubmitRejection = async () => {
    if (!selectedReason) {
      toast({
        title: "Validation Error",
        description: "Please select a rejection reason",
        variant: "destructive"
      })
      return
    }

    if (!detailedNotes.trim()) {
      toast({
        title: "Validation Error", 
        description: "Please provide detailed notes explaining the issue",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Generate digital signature for rejection
      const digitalSignature = `User: ${sessionStorage.getItem('userName') || 'QC Inspector'} - ID: ${sessionStorage.getItem('userId') || 'unknown'} - Timestamp: ${new Date().toISOString()}`

      const rejectionData = {
        qcType,
        rejectionReason: selectedReason.category,
        detailedNotes,
        correctiveActions,
        requiresRework: selectedReason.requiresAssemblyRework,
        severity: selectedReason.severity,
        digitalSignature
      }

      const response = await nextJsApiClient.post(`/orders/${orderId}/qc/reject`, rejectionData)

      if (response.data.success) {
        const newStatus = qcType === 'PRE_QC' ? 'PRE_QC_REJECTED' : 'FINAL_QC_REJECTED'
        
        toast({
          title: "QC Rejected",
          description: `Order has been rejected and moved to ${newStatus} status. Notifications sent to relevant personnel.`,
        })

        setIsOpen(false)
        onReject?.()
      } else {
        throw new Error(response.data.error || "Failed to submit rejection")
      }
    } catch (error) {
      console.error("Error submitting QC rejection:", error)
      toast({
        title: "Error",
        description: "Failed to submit QC rejection",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: { [key: string]: string } = {
      minor: "outline",
      major: "secondary", 
      critical: "destructive"
    }
    return (
      <Badge variant={variants[severity] as any} className="text-xs">
        {severity.toUpperCase()}
      </Badge>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <XCircle className="h-4 w-4" />
          Reject {qcType === 'PRE_QC' ? 'Pre-QC' : 'Final QC'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            QC Rejection - {qcType === 'PRE_QC' ? 'Pre-QC' : 'Final QC'}
          </DialogTitle>
          <DialogDescription>
            Reject this order and specify the issues that need to be addressed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Order Information</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{orderData.poNumber}</Badge>
              <span className="text-sm text-muted-foreground">{orderData.customerName}</span>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Quality Control Rejection</AlertTitle>
            <AlertDescription>
              This action will reject the order and trigger the appropriate workflow. 
              Notifications will be sent to Production Coordinators and Assemblers.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Select onValueChange={handleReasonSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select the primary reason for rejection" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{reason.category}</span>
                      {getSeverityBadge(reason.severity)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason && (
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedReason.category}</p>
                {getSeverityBadge(selectedReason.severity)}
              </div>
              <p className="text-sm text-muted-foreground">{selectedReason.description}</p>
              {selectedReason.requiresAssemblyRework && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-orange-600">Requires assembly rework</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Detailed Notes *</Label>
            <Textarea
              id="notes"
              value={detailedNotes}
              onChange={(e) => setDetailedNotes(e.target.value)}
              placeholder="Provide specific details about the issues found, locations of defects, measurements, etc."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actions">Recommended Corrective Actions</Label>
            <Textarea
              id="actions"
              value={correctiveActions}
              onChange={(e) => setCorrectiveActions(e.target.value)}
              placeholder="Suggest specific actions that should be taken to resolve the issues"
              rows={3}
            />
          </div>

          {selectedReason?.requiresAssemblyRework && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This rejection will move the order to <strong>ASSEMBLY_REWORK_{qcType === 'PRE_QC' ? 'PRE_QC' : 'FINAL_QC'}</strong> status.
                Assemblers will be notified to address the issues before re-submitting for QC.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false)
              onCancel?.()
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmitRejection}
            disabled={isSubmitting || !selectedReason || !detailedNotes.trim()}
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Rejection
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}