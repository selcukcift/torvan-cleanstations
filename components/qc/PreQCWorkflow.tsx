"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Play, AlertTriangle, FileCheck, Camera } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface PreQCWorkflowProps {
  orderId: string
  orderData: {
    poNumber: string
    customerName: string
    orderStatus: string
  }
  onStatusChange?: () => void
}

const REJECTION_CATEGORIES = [
  {
    category: "Dimensional Issues",
    description: "Measurements don't meet specifications",
    severity: "major"
  },
  {
    category: "Surface Finish",
    description: "Surface quality or finish defects",
    severity: "minor"
  },
  {
    category: "Material Defects",
    description: "Material quality or integrity issues",
    severity: "critical"
  },
  {
    category: "Assembly Errors",
    description: "Incorrect assembly or missing components",
    severity: "major"
  },
  {
    category: "Documentation Missing",
    description: "Required documentation or certifications missing",
    severity: "minor"
  },
  {
    category: "Packaging Issues",
    description: "Packaging defects or labeling errors",
    severity: "minor"
  }
]

export function PreQCWorkflow({
  orderId,
  orderData,
  onStatusChange
}: PreQCWorkflowProps) {
  const { toast } = useToast()
  const [isInitiateDialogOpen, setIsInitiateDialogOpen] = useState(false)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [initiateNotes, setInitiateNotes] = useState("")
  const [qcResult, setQcResult] = useState<'PASS' | 'FAIL' | ''>('')
  const [qcNotes, setQcNotes] = useState("")
  const [rejectionCategory, setRejectionCategory] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [requiresRework, setRequiresRework] = useState(false)
  const [digitalSignature, setDigitalSignature] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canInitiatePreQC = orderData.orderStatus === 'READY_FOR_PRODUCTION'
  const canCompletePreQC = orderData.orderStatus === 'READY_FOR_PRE_QC'

  const handleInitiatePreQC = async () => {
    try {
      setIsSubmitting(true)

      const response = await nextJsApiClient.post(`/orders/${orderId}/pre-qc`, {
        notes: initiateNotes
      })

      if (response.data.success) {
        toast({
          title: "Pre-QC Initiated",
          description: "Order moved to Pre-QC queue. QC personnel have been notified.",
        })

        setIsInitiateDialogOpen(false)
        setInitiateNotes("")
        onStatusChange?.()
      } else {
        throw new Error(response.data.error || "Failed to initiate Pre-QC")
      }
    } catch (error) {
      console.error("Error initiating Pre-QC:", error)
      toast({
        title: "Error",
        description: "Failed to initiate Pre-QC",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompletePreQC = async () => {
    if (!qcResult) {
      toast({
        title: "Validation Error",
        description: "Please select a QC result (Pass or Fail)",
        variant: "destructive"
      })
      return
    }

    if (qcResult === 'FAIL' && !rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a rejection reason for failed Pre-QC",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await nextJsApiClient.put(`/orders/${orderId}/pre-qc`, {
        result: qcResult,
        notes: qcNotes,
        rejectionReason: qcResult === 'FAIL' ? rejectionReason : undefined,
        rejectionCategory: qcResult === 'FAIL' ? rejectionCategory : undefined,
        requiresRework: qcResult === 'FAIL' ? requiresRework : false,
        digitalSignature: digitalSignature || `${new Date().toISOString()}_PreQC_${qcResult}`
      })

      if (response.data.success) {
        toast({
          title: "Pre-QC Completed",
          description: response.data.data.message,
        })

        setIsCompleteDialogOpen(false)
        // Reset form
        setQcResult('')
        setQcNotes("")
        setRejectionCategory("")
        setRejectionReason("")
        setRequiresRework(false)
        setDigitalSignature("")
        onStatusChange?.()
      } else {
        throw new Error(response.data.error || "Failed to complete Pre-QC")
      }
    } catch (error) {
      console.error("Error completing Pre-QC:", error)
      toast({
        title: "Error",
        description: "Failed to complete Pre-QC",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSelectedCategory = () => {
    return REJECTION_CATEGORIES.find(cat => cat.category === rejectionCategory)
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Pre-QC Workflow
        </CardTitle>
        <CardDescription>
          Optional pre-production quality control for order {orderData.poNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Status</p>
              <Badge variant="outline" className="mt-1">
                {orderData.orderStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              {canInitiatePreQC && (
                <Dialog open={isInitiateDialogOpen} onOpenChange={setIsInitiateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Play className="h-4 w-4" />
                      Initiate Pre-QC
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Initiate Pre-QC</DialogTitle>
                      <DialogDescription>
                        Move order {orderData.poNumber} to Pre-QC queue for inspection
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="initiate-notes">Notes (Optional)</Label>
                        <Textarea
                          id="initiate-notes"
                          value={initiateNotes}
                          onChange={(e) => setInitiateNotes(e.target.value)}
                          placeholder="Add any notes about why Pre-QC is being initiated"
                          rows={3}
                        />
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This will move the order to READY_FOR_PRE_QC status and notify QC personnel.
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="flex justify-end gap-2 pt-6">
                      <Button
                        variant="outline"
                        onClick={() => setIsInitiateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInitiatePreQC}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Initiating..." : "Initiate Pre-QC"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {canCompletePreQC && (
                <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Complete Pre-QC
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Complete Pre-QC Inspection</DialogTitle>
                      <DialogDescription>
                        Record Pre-QC results for order {orderData.poNumber}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <Label>QC Result *</Label>
                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant={qcResult === 'PASS' ? 'default' : 'outline'}
                            onClick={() => setQcResult('PASS')}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            PASS
                          </Button>
                          <Button
                            type="button"
                            variant={qcResult === 'FAIL' ? 'destructive' : 'outline'}
                            onClick={() => setQcResult('FAIL')}
                            className="gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            FAIL
                          </Button>
                        </div>
                      </div>

                      {qcResult === 'FAIL' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="rejection-category">Rejection Category *</Label>
                            <Select value={rejectionCategory} onValueChange={setRejectionCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rejection category" />
                              </SelectTrigger>
                              <SelectContent>
                                {REJECTION_CATEGORIES.map((category) => (
                                  <SelectItem key={category.category} value={category.category}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{category.category}</span>
                                      {getSeverityBadge(category.severity)}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {getSelectedCategory() && (
                            <div className="rounded-lg bg-muted p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{getSelectedCategory()?.category}</p>
                                {getSeverityBadge(getSelectedCategory()?.severity || '')}
                              </div>
                              <p className="text-sm text-muted-foreground">{getSelectedCategory()?.description}</p>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="rejection-reason">Detailed Rejection Reason *</Label>
                            <Textarea
                              id="rejection-reason"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Provide specific details about the quality issues found"
                              rows={3}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="requires-rework"
                              checked={requiresRework}
                              onCheckedChange={(checked) => setRequiresRework(checked as boolean)}
                            />
                            <Label htmlFor="requires-rework">
                              Requires Rework (will move order to rework status)
                            </Label>
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="qc-notes">Additional Notes</Label>
                        <Textarea
                          id="qc-notes"
                          value={qcNotes}
                          onChange={(e) => setQcNotes(e.target.value)}
                          placeholder="Add any additional notes about the inspection"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="digital-signature">Digital Signature</Label>
                        <div className="text-sm text-muted-foreground mb-2">
                          Your signature will be automatically generated for compliance purposes
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-sm">
                          Preview: {new Date().toISOString()}_PreQC_{qcResult || 'PENDING'}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-6">
                      <Button
                        variant="outline"
                        onClick={() => setIsCompleteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCompletePreQC}
                        disabled={isSubmitting || !qcResult || (qcResult === 'FAIL' && !rejectionReason.trim())}
                        variant={qcResult === 'FAIL' ? 'destructive' : 'default'}
                      >
                        {isSubmitting ? "Submitting..." : `Complete Pre-QC (${qcResult || 'Select Result'})`}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {!canInitiatePreQC && !canCompletePreQC && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Pre-QC is not available for orders in {orderData.orderStatus.replace(/_/g, ' ')} status.
                {orderData.orderStatus === 'READY_FOR_PRODUCTION' 
                  ? ' Use "Initiate Pre-QC" to begin inspection.'
                  : orderData.orderStatus === 'READY_FOR_PRE_QC'
                  ? ' Order is ready for QC personnel to complete inspection.'
                  : ' Order must be in READY_FOR_PRODUCTION status to initiate Pre-QC.'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}