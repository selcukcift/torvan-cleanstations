"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  Send,
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  User,
  Package,
  Loader2
} from "lucide-react"
import { format } from "date-fns"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface QCTemplateItem {
  id: string
  section: string
  checklistItem: string
  itemType: 'PASS_FAIL' | 'TEXT_INPUT' | 'NUMERIC_INPUT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'DATE_INPUT' | 'CHECKBOX'
  isBasinSpecific?: boolean
  isRequired: boolean
  order: number
  options?: any
  expectedValue?: string
  applicabilityCondition?: string
  repeatPer?: string
  repeatIndex?: number
  originalId?: string
  notesPrompt?: string
}

interface QCTemplate {
  id: string
  formName: string
  formType: string
  version: string
  description?: string
  appliesToProductFamily?: string
  items: QCTemplateItem[]
}

interface QCFormData {
  [itemId: string]: {
    value: any
    notes?: string
    passed?: boolean
  }
}

interface QCFormInterfaceProps {
  orderId: string
  orderData?: {
    poNumber: string
    customerName: string
    productFamily: string
    buildNumbers: string[]
    status?: string
  }
  template?: QCTemplate
  session?: any
}

export function QCFormInterface({ orderId, orderData, template: templateProp, session }: QCFormInterfaceProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [template, setTemplate] = useState<QCTemplate | null>(templateProp || null)
  const [formData, setFormData] = useState<QCFormData>({})
  const [loading, setLoading] = useState(!templateProp)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [overallResult, setOverallResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [inspectorNotes, setInspectorNotes] = useState("")

  useEffect(() => {
    if (templateProp) {
      setTemplate(templateProp)
      initializeFormData(templateProp)
      setLoading(false)
    } else {
      fetchQCTemplate()
    }
  }, [orderId, templateProp])

  const initializeFormData = (qcTemplate: QCTemplate) => {
    const initialFormData: QCFormData = {}
    qcTemplate.items.forEach((item: QCTemplateItem) => {
      initialFormData[item.id] = {
        value: item.itemType === 'CHECKBOX' ? false : '',
        notes: '',
        passed: undefined
      }
    })
    setFormData(initialFormData)
  }

  const fetchQCTemplate = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/orders/${orderId}/qc/template`)
      
      if (response.data.success) {
        setTemplate(response.data.template)
        // Initialize form data
        const initialFormData: QCFormData = {}
        response.data.template.items.forEach((item: QCTemplateItem) => {
          initialFormData[item.id] = {
            value: item.itemType === 'CHECKBOX' ? false : '',
            notes: '',
            passed: item.itemType === 'PASS_FAIL' ? undefined : true
          }
        })
        setFormData(initialFormData)
      }
    } catch (error: any) {
      console.error('Error fetching QC template:', error)
      toast({
        title: "Error",
        description: "Failed to load QC template",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleItemValueChange = (itemId: string, value: any, field: 'value' | 'notes' | 'passed' = 'value') => {
    setFormData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }))
  }

  const handleSaveProgress = async () => {
    try {
      setSaving(true)
      // Convert form data to expected format
      const qcItems = Object.entries(formData).map(([itemId, data]) => ({
        templateItemId: itemId,
        value: String(data.value),
        passed: data.passed,
        notes: data.notes
      }))

      const response = await nextJsApiClient.post(`/orders/${orderId}/qc`, {
        templateId: template?.id,
        status: 'IN_PROGRESS',
        qcItems,
        notes: inspectorNotes
      })

      if (response.data.success) {
        toast({
          title: "Progress Saved",
          description: "QC inspection progress has been saved"
        })
      }
    } catch (error: any) {
      console.error('Error saving QC progress:', error)
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitQC = async () => {
    try {
      // Validate required fields
      const requiredItems = template?.items.filter(item => item.isRequired) || []
      const missingItems = requiredItems.filter(item => {
        const value = formData[item.id]?.value
        return !value || (item.itemType === 'PASS_FAIL' && formData[item.id]?.passed === undefined)
      })

      if (missingItems.length > 0) {
        toast({
          title: "Validation Error",
          description: `Please complete all required fields: ${missingItems.map(item => item.checklistItem).join(', ')}`,
          variant: "destructive"
        })
        return
      }

      if (!overallResult) {
        toast({
          title: "Validation Error",
          description: "Please select the overall QC result",
          variant: "destructive"
        })
        return
      }

      setSubmitting(true)

      // Convert form data to expected format
      const qcItems = Object.entries(formData).map(([itemId, data]) => ({
        templateItemId: itemId,
        value: String(data.value),
        passed: data.passed,
        notes: data.notes
      }))

      // Prepare submission payload with digital signature as per Sprint 3.1
      const submissionPayload = {
        templateId: template?.id,
        overallStatus: overallResult === 'PASSED' ? 'PASSED' : 'FAILED',
        notes: inspectorNotes,
        itemResults: qcItems,
        digitalSignature: {
          userId: session?.user?.id || session?.user?.email,
          timestamp: new Date().toISOString(),
          userName: session?.user?.name || 'Unknown User'
        }
      }

      console.log('Submitting QC form with digital signature:', submissionPayload)
      
      const response = await nextJsApiClient.post(`/orders/${orderId}/qc`, submissionPayload)

      if (response.data.success) {
        const isPreQC = orderData?.status === 'ReadyForPreQC'
        const nextStatus = isPreQC ? 'Ready for Production' : 'Ready for Ship'
        
        toast({
          title: "QC Submitted",
          description: `QC inspection ${overallResult.toLowerCase()} and submitted successfully. Order status updated to ${nextStatus}.`
        })
        
        // Redirect back to order details page
        router.push(`/orders/${orderId}`)
      }
    } catch (error: any) {
      console.error('Error submitting QC:', error)
      toast({
        title: "Error",
        description: "Failed to submit QC inspection",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderFormField = (item: QCTemplateItem) => {
    const itemData = formData[item.id] || { value: '', notes: '', passed: undefined }

    switch (item.itemType) {
      case 'PASS_FAIL':
        return (
          <div className="space-y-3">
            <RadioGroup
              value={itemData.passed === true ? 'pass' : itemData.passed === false ? 'fail' : ''}
              onValueChange={(value) => handleItemValueChange(item.id, value === 'pass', 'passed')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pass" id={`${item.id}-pass`} />
                <Label htmlFor={`${item.id}-pass`} className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Pass
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fail" id={`${item.id}-fail`} />
                <Label htmlFor={`${item.id}-fail`} className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-4 h-4" />
                  Fail
                </Label>
              </div>
            </RadioGroup>
          </div>
        )

      case 'TEXT_INPUT':
        return (
          <Input
            value={itemData.value}
            onChange={(e) => handleItemValueChange(item.id, e.target.value)}
            placeholder="Enter text..."
            className="w-full"
          />
        )

      case 'NUMERIC_INPUT':
        return (
          <Input
            type="number"
            value={itemData.value}
            onChange={(e) => handleItemValueChange(item.id, e.target.value)}
            placeholder={`Enter number${item.expectedValue ? ` (${item.expectedValue})` : ''}`}
            className="w-full"
          />
        )

      case 'SINGLE_SELECT':
        const selectOptions = typeof item.options === 'string' 
          ? JSON.parse(item.options || '[]') 
          : (item.options || []);
        return (
          <Select value={itemData.value} onValueChange={(value) => handleItemValueChange(item.id, value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'MULTI_SELECT':
        const multiOptions = typeof item.options === 'string' 
          ? JSON.parse(item.options || '[]') 
          : (item.options || []);
        return (
          <div className="space-y-2">
            {multiOptions.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${item.id}-${option}`}
                  checked={(itemData.value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = itemData.value || []
                    if (checked) {
                      handleItemValueChange(item.id, [...currentValues, option])
                    } else {
                      handleItemValueChange(item.id, currentValues.filter((v: string) => v !== option))
                    }
                  }}
                />
                <Label htmlFor={`${item.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        )

      case 'DATE_INPUT':
        return (
          <Input
            type="date"
            value={itemData.value}
            onChange={(e) => handleItemValueChange(item.id, e.target.value)}
            className="w-full"
          />
        )

      case 'CHECKBOX':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={item.id}
              checked={itemData.value}
              onCheckedChange={(checked) => handleItemValueChange(item.id, checked)}
            />
            <Label htmlFor={item.id}>Yes</Label>
          </div>
        )

      default:
        return <div>Unsupported field type</div>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-lg font-medium">No QC Template Found</p>
          <p className="text-slate-600">No quality control template is configured for this order.</p>
        </CardContent>
      </Card>
    )
  }

  // Group items by category
  const itemsByCategory = template.items.reduce((acc, item) => {
    const category = item.section || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, QCTemplateItem[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                {template.formName}
              </CardTitle>
              <CardDescription>{template.description}</CardDescription>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                {orderData && (
                  <>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      PO: {orderData.poNumber}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {orderData.customerName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(), "MMM dd, yyyy")}
                    </div>
                  </>
                )}
              </div>
            </div>
            <Badge variant="outline">Version {template.version}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* QC Form */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Control Inspection</CardTitle>
          <CardDescription>Complete all required items to submit the QC inspection</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <Badge variant="secondary">{items.length} items</Badge>
                  </div>
                  
                  <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                    {items
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <div key={item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id} className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Label className="text-base font-medium flex items-center gap-2">
                                {item.checklistItem}
                                {item.isRequired && <span className="text-red-500">*</span>}
                                {(item.isBasinSpecific || item.repeatIndex) && (
                                  <Badge variant="outline" className="text-xs ml-2">
                                    {item.repeatIndex ? `Basin ${item.repeatIndex}` : 'Basin Specific'}
                                  </Badge>
                                )}
                                {item.applicabilityCondition && (
                                  <Badge variant="secondary" className="text-xs ml-2">Dynamic</Badge>
                                )}
                              </Label>
                              {item.expectedValue && (
                                <p className="text-sm text-slate-600 mt-1">Expected: {item.expectedValue}</p>
                              )}
                              {item.notesPrompt && (
                                <p className="text-sm text-blue-600 mt-1 italic">{item.notesPrompt}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            {renderFormField(item)}
                          </div>

                          {/* Notes field for each item */}
                          <div className="ml-4">
                            <Label className="text-sm text-slate-600">Notes (Optional)</Label>
                            <Textarea
                              value={formData[item.id]?.notes || ''}
                              onChange={(e) => handleItemValueChange(item.id, e.target.value, 'notes')}
                              placeholder={item.notesPrompt || "Add any additional notes..."}
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                          
                          <Separator />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Overall Result and Inspector Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Overall QC Result</CardTitle>
          <CardDescription>Provide the final inspection result and any additional notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">Overall Result *</Label>
            <RadioGroup
              value={overallResult || ''}
              onValueChange={(value) => setOverallResult(value as 'PASSED' | 'FAILED')}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PASSED" id="overall-pass" />
                <Label htmlFor="overall-pass" className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  PASSED - Ready to proceed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FAILED" id="overall-fail" />
                <Label htmlFor="overall-fail" className="flex items-center gap-2 text-red-600 font-medium">
                  <XCircle className="w-5 h-5" />
                  FAILED - Requires rework
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">Inspector Notes</Label>
            <Textarea
              value={inspectorNotes}
              onChange={(e) => setInspectorNotes(e.target.value)}
              placeholder="Add any overall notes, observations, or recommendations..."
              rows={4}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveProgress}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Progress
          </Button>

          <Button
            onClick={handleSubmitQC}
            disabled={submitting || !overallResult}
            className="flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit QC
          </Button>
        </div>
      </div>
    </div>
  )
}