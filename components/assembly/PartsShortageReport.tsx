"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Package, Send, RefreshCw } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface PartsShortageReportProps {
  orderId: string
  orderData: {
    poNumber: string
    customerName: string
  }
  bomItems?: Array<{
    id: string
    partIdOrAssemblyId: string
    name: string
    quantity: number
  }>
  onReport?: () => void
}

interface ShortageIssue {
  category: string
  description: string
  severity: 'minor' | 'major' | 'critical'
}

const SHORTAGE_CATEGORIES: ShortageIssue[] = [
  {
    category: "Part Not Available",
    description: "Required part is completely out of stock",
    severity: "critical"
  },
  {
    category: "Insufficient Quantity",
    description: "Not enough parts to complete assembly",
    severity: "major"
  },
  {
    category: "Part Damaged",
    description: "Part received but damaged/defective",
    severity: "major"
  },
  {
    category: "Wrong Part Received",
    description: "Incorrect part number delivered",
    severity: "major"
  },
  {
    category: "Quality Issue",
    description: "Part quality does not meet specifications",
    severity: "minor"
  },
  {
    category: "Supplier Delay",
    description: "Expected delivery delayed by supplier",
    severity: "major"
  },
  {
    category: "Documentation Missing",
    description: "Required certificates/documentation not provided",
    severity: "minor"
  }
]

export function PartsShortageReport({
  orderId,
  orderData,
  bomItems = [],
  onReport
}: PartsShortageReportProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<ShortageIssue | null>(null)
  const [quantityNeeded, setQuantityNeeded] = useState("")
  const [quantityAvailable, setQuantityAvailable] = useState("")
  const [issueDescription, setIssueDescription] = useState("")
  const [expectedResolution, setExpectedResolution] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCategorySelect = (categoryIndex: string) => {
    const category = SHORTAGE_CATEGORIES[parseInt(categoryIndex)]
    setSelectedCategory(category)
  }

  const handlePartSelect = (partId: string) => {
    setSelectedPart(partId)
    const part = bomItems.find(item => item.id === partId)
    if (part) {
      setQuantityNeeded(part.quantity.toString())
    }
  }

  const handleSubmitReport = async () => {
    if (!selectedPart) {
      toast({
        title: "Validation Error",
        description: "Please select the affected part",
        variant: "destructive"
      })
      return
    }

    if (!selectedCategory) {
      toast({
        title: "Validation Error",
        description: "Please select the issue category",
        variant: "destructive"
      })
      return
    }

    if (!issueDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a detailed description of the issue",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const selectedPartData = bomItems.find(item => item.id === selectedPart)
      
      const reportData = {
        partId: selectedPartData?.partIdOrAssemblyId,
        partName: selectedPartData?.name,
        bomItemId: selectedPart,
        issueCategory: selectedCategory.category,
        issueDescription,
        quantityNeeded: parseInt(quantityNeeded) || 0,
        quantityAvailable: parseInt(quantityAvailable) || 0,
        expectedResolution,
        severity: selectedCategory.severity
      }

      const response = await nextJsApiClient.post(`/orders/${orderId}/parts/shortage`, reportData)

      if (response.data.success) {
        toast({
          title: "Parts Issue Reported",
          description: `Parts shortage has been reported. Order moved to ASSEMBLY_ON_HOLD_PARTS_ISSUE status. Procurement and coordinators have been notified.`,
        })

        setIsOpen(false)
        onReport?.()
        
        // Reset form
        setSelectedPart("")
        setSelectedCategory(null)
        setQuantityNeeded("")
        setQuantityAvailable("")
        setIssueDescription("")
        setExpectedResolution("")
      } else {
        throw new Error(response.data.error || "Failed to submit parts shortage report")
      }
    } catch (error) {
      console.error("Error submitting parts shortage report:", error)
      toast({
        title: "Error",
        description: "Failed to submit parts shortage report",
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
        <Button variant="outline" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Report Parts Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Report Parts Shortage/Issue
          </DialogTitle>
          <DialogDescription>
            Report parts shortage or quality issues that are blocking assembly
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
            <AlertTitle>Assembly Hold</AlertTitle>
            <AlertDescription>
              Reporting a parts issue will place this order on hold until the issue is resolved.
              Procurement and Production Coordinators will be immediately notified.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="part">Affected Part/Assembly *</Label>
            <Select onValueChange={handlePartSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select the part causing the issue" />
              </SelectTrigger>
              <SelectContent>
                {bomItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-sm">{item.partIdOrAssemblyId}</span>
                      <span className="ml-2">{item.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Issue Category *</Label>
            <Select onValueChange={handleCategorySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select the type of issue" />
              </SelectTrigger>
              <SelectContent>
                {SHORTAGE_CATEGORIES.map((category, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{category.category}</span>
                      {getSeverityBadge(category.severity)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedCategory.category}</p>
                {getSeverityBadge(selectedCategory.severity)}
              </div>
              <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="needed">Quantity Needed</Label>
              <Input
                id="needed"
                type="number"
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(e.target.value)}
                placeholder="Required quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available">Quantity Available</Label>
              <Input
                id="available"
                type="number"
                value={quantityAvailable}
                onChange={(e) => setQuantityAvailable(e.target.value)}
                placeholder="Currently available"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Issue Description *</Label>
            <Textarea
              id="description"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Provide specific details about the parts issue, including part condition, delivery status, quality problems, etc."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Expected Resolution</Label>
            <Textarea
              id="resolution"
              value={expectedResolution}
              onChange={(e) => setExpectedResolution(e.target.value)}
              placeholder="If known, provide information about expected delivery date, supplier status, or required actions"
              rows={2}
            />
          </div>

          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertDescription>
              This report will move the order to <strong>ASSEMBLY_ON_HOLD_PARTS_ISSUE</strong> status
              and notify Procurement Specialists and Production Coordinators for immediate action.
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
            variant="destructive"
            onClick={handleSubmitReport}
            disabled={isSubmitting || !selectedPart || !selectedCategory || !issueDescription.trim()}
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Report Issue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}