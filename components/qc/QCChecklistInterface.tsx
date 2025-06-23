"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ClipboardCheck,
  Camera,
  Video,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Package,
  User,
  Calendar,
  Loader2,
  Save,
  Send
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
  isRequired: boolean
  order: number
  options?: any
  expectedValue?: string
}

interface QCTemplate {
  id: string
  name: string
  description: string
  items: QCTemplateItem[]
}

interface QCFormData {
  [itemId: string]: {
    value: any
    mediaFiles?: File[]
  }
}

interface QCChecklistInterfaceProps {
  orderId: string
  orderData?: {
    poNumber: string
    customerName: string
    buildNumbers: string[]
    status?: string
  }
  template?: QCTemplate
  session?: any
  orderConfiguration?: any
}

export function QCChecklistInterface({ orderId, orderData, template: templateProp, session, orderConfiguration }: QCChecklistInterfaceProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [template, setTemplate] = useState<QCTemplate | null>(templateProp || null)
  const [formData, setFormData] = useState<QCFormData>({})
  const [loading, setLoading] = useState(!templateProp)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [overallResult, setOverallResult] = useState<'PASSED' | 'FAILED' | null>(null)

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
    const initialData: QCFormData = {}
    qcTemplate.items.forEach(item => {
      initialData[item.id] = { value: '', mediaFiles: [] }
    })
    setFormData(initialData)
  }

  const loadExistingResults = (existingResult: any, qcTemplate: QCTemplate) => {
    if (!existingResult.itemResults) return
    
    const loadedData: QCFormData = {}
    qcTemplate.items.forEach(item => {
      // Find matching result
      const itemResult = existingResult.itemResults.find((result: any) => 
        result.qcFormTemplateItemId === item.id
      )
      
      if (itemResult) {
        loadedData[item.id] = {
          value: item.itemType === 'CHECKBOX' ? itemResult.isConformant : itemResult.resultValue,
          mediaFiles: [] // TODO: Load media files if needed
        }
      } else {
        loadedData[item.id] = { value: '', mediaFiles: [] }
      }
    })
    
    setFormData(loadedData)
    setOverallResult(existingResult.overallStatus)
  }

  const fetchQCTemplate = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/orders/${orderId}/qc/template?formType=Pre-Production%20Check`)
      
      if (response.data.success) {
        setTemplate(response.data.template)
        initializeFormData(response.data.template)
        
        if (response.data.existingResult) {
          // Load existing form data if available
          loadExistingResults(response.data.existingResult, response.data.template)
        }
      } else {
        throw new Error(response.data.error || 'Failed to fetch template')
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

  const handleItemValueChange = (itemId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        value
      }
    }))
  }

  const handleMediaCapture = (itemId: string, file: File, type: 'photo' | 'video') => {
    setFormData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        mediaFiles: [...(prev[itemId]?.mediaFiles || []), file]
      }
    }))
  }

  const getProgress = (): number => {
    if (!template) return 0
    const totalItems = template.items.length
    const completedItems = template.items.filter(item => {
      const itemData = formData[item.id]
      if (!itemData) return false
      
      if (item.isRequired) {
        if (item.itemType === 'CHECKBOX') {
          return itemData.value === true
        }
        return itemData.value !== '' && itemData.value !== null && itemData.value !== undefined
      }
      return true // Non-required items are considered completed
    }).length

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  }

  const handleSave = async () => {
    if (!template) return
    
    setSaving(true)
    try {
      // Prepare draft submission data (same structure but marked as incomplete)
      const submissionData = {
        templateId: template.id,
        overallStatus: 'FAILED', // Draft status - will be updated on final submission
        inspectorNotes: '(Draft - In Progress)',
        itemResults: template.items.map(item => ({
          qcFormTemplateItemId: item.id,
          resultValue: formData[item.id]?.value?.toString() || '',
          isConformant: item.itemType === 'CHECKBOX' ? formData[item.id]?.value === true : false,
          notes: '',
          isNotApplicable: false
        }))
      }
      
      // Save draft to API
      const response = await nextJsApiClient.post(`/orders/${orderId}/qc`, submissionData)
      
      if (response.data.success) {
        toast({
          title: "Progress Saved",
          description: "Your QC checklist progress has been saved as draft.",
        })
      } else {
        throw new Error(response.data.error || 'Save failed')
      }
    } catch (error: any) {
      console.error('QC save error:', error)
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save progress",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!template) return
    
    setSubmitting(true)
    try {
      // Determine overall status based on required items completion
      const requiredItems = template.items.filter(item => item.isRequired)
      const failedRequiredItems = requiredItems.filter(item => {
        const itemData = formData[item.id]
        if (!itemData) return true
        
        if (item.itemType === 'CHECKBOX') {
          return itemData.value !== true
        }
        return !itemData.value || itemData.value === ''
      })
      
      const overallStatus = failedRequiredItems.length === 0 ? 'PASSED' : 'FAILED'
      
      // Prepare submission data
      const submissionData = {
        templateId: template.id,
        overallStatus,
        inspectorNotes: '', // No notes in new design
        itemResults: template.items.map(item => ({
          qcFormTemplateItemId: item.id,
          resultValue: formData[item.id]?.value?.toString() || '',
          isConformant: item.itemType === 'CHECKBOX' ? formData[item.id]?.value === true : true,
          notes: '', // No notes in new design
          isNotApplicable: false
        }))
      }
      
      // Submit to API
      const response = await nextJsApiClient.post(`/orders/${orderId}/qc`, submissionData)
      
      if (response.data.success) {
        toast({
          title: "QC Submitted Successfully",
          description: `Pre-Production Check completed with status: ${overallStatus}. Order status updated.`,
        })
        router.push(`/orders/${orderId}`)
      } else {
        throw new Error(response.data.error || 'Submission failed')
      }
    } catch (error: any) {
      console.error('QC submission error:', error)
      toast({
        title: "Submission Failed", 
        description: error.message || "Failed to submit QC checklist",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderChecklistItem = (item: QCTemplateItem) => {
    const itemData = formData[item.id] || { value: '', mediaFiles: [] }
    const isCompleted = item.isRequired ? 
      (item.itemType === 'CHECKBOX' ? itemData.value === true : itemData.value !== '' && itemData.value !== null) :
      true

    return (
      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
        {/* Completion Status */}
        <div className="flex-shrink-0">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
        </div>

        {/* Item Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium leading-relaxed">
                {item.checklistItem}
                {item.isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {/* Input based on item type */}
              <div className="mt-2">
                {item.itemType === 'CHECKBOX' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={itemData.value === true}
                      onCheckedChange={(checked) => handleItemValueChange(item.id, checked)}
                    />
                    <Label htmlFor={item.id} className="text-sm text-gray-600">
                      Verified
                    </Label>
                  </div>
                )}

                {item.itemType === 'TEXT_INPUT' && (
                  <Input
                    value={itemData.value || ''}
                    onChange={(e) => handleItemValueChange(item.id, e.target.value)}
                    placeholder="Enter value..."
                    className="max-w-xs"
                  />
                )}

                {item.itemType === 'SINGLE_SELECT' && (
                  <Select
                    value={itemData.value || ''}
                    onValueChange={(value) => handleItemValueChange(item.id, value)}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Select option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(JSON.parse(item.options || '[]')).map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Media Capture Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Photo capture implementation
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.capture = 'environment'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleMediaCapture(item.id, file, 'photo')
                  }
                  input.click()
                }}
              >
                <Camera className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Video capture implementation
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'video/*'
                  input.capture = 'environment'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleMediaCapture(item.id, file, 'video')
                  }
                  input.click()
                }}
              >
                <Video className="w-4 h-4" />
              </Button>

              {/* Media count badge */}
              {itemData.mediaFiles && itemData.mediaFiles.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {itemData.mediaFiles.length}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading QC checklist...</span>
      </div>
    )
  }

  if (!template) {
    return (
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          No QC template found for this order.
        </AlertDescription>
      </Alert>
    )
  }

  const progress = getProgress()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                {template.name}
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
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{progress}%</div>
              <div className="text-sm text-slate-600">Complete</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="pt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>{template.items.filter(item => {
                const itemData = formData[item.id]
                return itemData && (item.itemType === 'CHECKBOX' ? itemData.value === true : itemData.value !== '')
              }).length} of {template.items.length} completed</span>
              <span>{progress}%</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Checklist Items */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {template.items.map((item) => renderChecklistItem(item))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={saving}
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Save Progress
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={submitting || progress < 100}
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Send className="w-4 h-4 mr-2" />
          Submit Checklist
        </Button>
      </div>
    </div>
  )
}