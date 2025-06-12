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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Loader2,
  Info,
  Eye,
  FileText,
  Camera
} from "lucide-react"
import { format } from "date-fns"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface QCTemplateItem {
  id: string
  section: string
  checklistItem: string
  itemType: 'PASS_FAIL' | 'TEXT_INPUT' | 'NUMERIC_INPUT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'DATE_INPUT' | 'CHECKBOX'
  isRequired: boolean
  order: number
  options?: any
  expectedValue?: string
  applicabilityCondition?: string
  repeatPer?: string
  notesPrompt?: string
  relatedAssemblyId?: string
  relatedPartNumber?: string
}

interface QCTemplate {
  id: string
  name: string
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
    isNotApplicable?: boolean
  }
}

interface QCFormInterfaceEnhancedProps {
  orderId: string
  orderData?: {
    poNumber: string
    customerName: string
    productFamily: string
    buildNumbers: string[]
    status?: string
    configurations?: any
  }
  template?: QCTemplate
  onSubmit?: (data: any) => void
  loading?: boolean
}

export function QCFormInterfaceEnhanced({ 
  orderId, 
  orderData, 
  template: templateProp, 
  onSubmit,
  loading: externalLoading = false
}: QCFormInterfaceEnhancedProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { data: session } = useSession()
  const [template, setTemplate] = useState<QCTemplate | null>(templateProp || null)
  const [formData, setFormData] = useState<QCFormData>({})
  const [loading, setLoading] = useState(!templateProp)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [overallResult, setOverallResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [inspectorNotes, setInspectorNotes] = useState("")
  const [digitalSignature, setDigitalSignature] = useState("")
  const [orderConfiguration, setOrderConfiguration] = useState<any>(null)

  useEffect(() => {
    if (templateProp) {
      setTemplate(templateProp)
      initializeFormData(templateProp)
      setLoading(false)
    } else {
      fetchQCTemplate()
    }
    fetchOrderConfiguration()
  }, [orderId, templateProp])

  const fetchOrderConfiguration = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}`)
      if (response.data.success) {
        setOrderConfiguration(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching order configuration:', error)
    }
  }

  const initializeFormData = (qcTemplate: QCTemplate) => {
    const initialFormData: QCFormData = {}
    qcTemplate.items.forEach((item: QCTemplateItem) => {
      initialFormData[item.id] = {
        value: item.itemType === 'CHECKBOX' ? false : 
               item.itemType === 'PASS_FAIL' ? null : '',
        notes: '',
        passed: item.itemType === 'PASS_FAIL' ? undefined : true,
        isNotApplicable: false
      }
    })
    setFormData(initialFormData)
  }

  const fetchQCTemplate = async () => {
    try {
      setLoading(true)
      
      // Determine form type based on order status
      let formType = 'Pre-Production Check'
      if (orderData?.status === 'ReadyForFinalQC') {
        formType = 'Final Quality Check'
      } else if (orderData?.status === 'ReadyForProduction') {
        formType = 'Production Check'
      }
      
      const response = await nextJsApiClient.get(`/orders/${orderId}/qc/template?formType=${encodeURIComponent(formType)}`)
      
      if (response.data.template) {
        setTemplate(response.data.template)
        initializeFormData(response.data.template)
      } else {
        toast({
          title: "No Template Found",
          description: `No QC template found for ${formType}`,
          variant: "destructive"
        })
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

  const handleItemValueChange = (itemId: string, value: any, field: 'value' | 'notes' | 'passed' | 'isNotApplicable' = 'value') => {
    setFormData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }))
  }

  // Check if an item should be displayed based on applicability conditions
  const isItemApplicable = (item: QCTemplateItem): boolean => {
    if (!item.applicabilityCondition || !orderConfiguration) return true
    
    // Simple condition checking - can be enhanced based on needs
    const condition = item.applicabilityCondition
    
    // Check for pegboard selection
    if (condition.includes('pegboard_selected')) {
      return orderConfiguration.sinkConfigurations?.some((config: any) => config.pegboard)
    }
    
    // Check for basin types
    if (condition.includes('basin_') && condition.includes('_e_drain')) {
      return orderConfiguration.basinConfigurations?.some((basin: any) => 
        basin.basinTypeId?.toLowerCase().includes('e-drain')
      )
    }
    
    if (condition.includes('basin_') && condition.includes('_e_sink')) {
      return orderConfiguration.basinConfigurations?.some((basin: any) => 
        basin.basinTypeId?.toLowerCase().includes('e-sink')
      )
    }
    
    // Check for E-Sink basins present
    if (condition === 'e_sink_basins_present') {
      return orderConfiguration.basinConfigurations?.some((basin: any) => 
        basin.basinTypeId?.toLowerCase().includes('e-sink')
      )
    }
    
    // Check for E-Drain basins present
    if (condition === 'e_drain_basins_present') {
      return orderConfiguration.basinConfigurations?.some((basin: any) => 
        basin.basinTypeId?.toLowerCase().includes('e-drain')
      )
    }
    
    // Default to true for unknown conditions
    return true
  }

  const renderFormField = (item: QCTemplateItem) => {
    const currentValue = formData[item.id]?.value
    const isNA = formData[item.id]?.isNotApplicable

    if (!isItemApplicable(item)) {
      return null
    }

    const fieldId = `field-${item.id}`
    
    return (
      <div key={item.id} className="space-y-3 p-4 border rounded-lg bg-card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Label htmlFor={fieldId} className="text-sm font-medium leading-relaxed">
              {item.checklistItem}
              {item.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {item.notesPrompt && (
              <p className="text-xs text-muted-foreground mt-1">{item.notesPrompt}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* N/A Option for optional items */}
            {!item.isRequired && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`na-${item.id}`}
                  checked={isNA}
                  onCheckedChange={(checked) => 
                    handleItemValueChange(item.id, checked, 'isNotApplicable')
                  }
                />
                <Label htmlFor={`na-${item.id}`} className="text-xs text-muted-foreground">
                  N/A
                </Label>
              </div>
            )}
          </div>
        </div>

        {/* Form Field based on type */}
        {!isNA && (
          <div className="space-y-2">
            {item.itemType === 'PASS_FAIL' && (
              <RadioGroup
                value={currentValue?.toString() || ''}
                onValueChange={(value) => {
                  const boolValue = value === 'true'
                  handleItemValueChange(item.id, boolValue)
                  handleItemValueChange(item.id, boolValue, 'passed')
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`${fieldId}-pass`} />
                  <Label htmlFor={`${fieldId}-pass`} className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Pass
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`${fieldId}-fail`} />
                  <Label htmlFor={`${fieldId}-fail`} className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Fail
                  </Label>
                </div>
              </RadioGroup>
            )}

            {item.itemType === 'TEXT_INPUT' && (
              <Input
                id={fieldId}
                value={currentValue || ''}
                onChange={(e) => handleItemValueChange(item.id, e.target.value)}
                placeholder="Enter value..."
                className="w-full"
              />
            )}

            {item.itemType === 'NUMERIC_INPUT' && (
              <Input
                id={fieldId}
                type="number"
                value={currentValue || ''}
                onChange={(e) => handleItemValueChange(item.id, e.target.value)}
                placeholder="Enter numeric value..."
                className="w-full"
              />
            )}

            {item.itemType === 'DATE_INPUT' && (
              <Input
                id={fieldId}
                type="date"
                value={currentValue || ''}
                onChange={(e) => handleItemValueChange(item.id, e.target.value)}
                className="w-full"
              />
            )}

            {item.itemType === 'SINGLE_SELECT' && item.options && (
              <Select 
                value={currentValue || ''} 
                onValueChange={(value) => handleItemValueChange(item.id, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(item.options) ? 
                    item.options.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    )) : 
                    JSON.parse(item.options).map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            )}

            {item.itemType === 'CHECKBOX' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={fieldId}
                  checked={currentValue || false}
                  onCheckedChange={(checked) => handleItemValueChange(item.id, checked)}
                />
                <Label htmlFor={fieldId}>
                  {item.expectedValue || 'Check if applicable'}
                </Label>
              </div>
            )}
          </div>
        )}

        {/* Notes field */}
        <div className="space-y-1">
          <Label htmlFor={`notes-${item.id}`} className="text-xs text-muted-foreground">
            Notes (optional)
          </Label>
          <Textarea
            id={`notes-${item.id}`}
            value={formData[item.id]?.notes || ''}
            onChange={(e) => handleItemValueChange(item.id, e.target.value, 'notes')}
            placeholder="Add any observations or notes..."
            className="min-h-[60px] text-sm"
          />
        </div>
      </div>
    )
  }

  const groupItemsBySection = (items: QCTemplateItem[]) => {
    const grouped: { [section: string]: QCTemplateItem[] } = {}
    items.forEach(item => {
      if (!grouped[item.section]) {
        grouped[item.section] = []
      }
      grouped[item.section].push(item)
    })
    return grouped
  }

  const calculateOverallResult = () => {
    const passFailItems = template?.items.filter(item => 
      item.itemType === 'PASS_FAIL' && isItemApplicable(item)
    ) || []
    
    const failedItems = passFailItems.filter(item => {
      const itemData = formData[item.id]
      return !itemData?.isNotApplicable && itemData?.value === false
    })
    
    return failedItems.length === 0 ? 'PASSED' : 'FAILED'
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      
      // Validate required fields
      const requiredItems = template?.items.filter(item => 
        item.isRequired && isItemApplicable(item)
      ) || []
      
      const missingRequired = requiredItems.filter(item => {
        const itemData = formData[item.id]
        return !itemData?.isNotApplicable && (
          itemData?.value === null || 
          itemData?.value === undefined || 
          itemData?.value === ''
        )
      })
      
      if (missingRequired.length > 0) {
        toast({
          title: "Missing Required Fields",
          description: `Please complete all required fields: ${missingRequired.map(item => item.checklistItem).join(', ')}`,
          variant: "destructive"
        })
        return
      }

      const calculatedResult = calculateOverallResult()
      
      // Prepare submission data
      const submissionData = {
        templateId: template?.id,
        overallStatus: calculatedResult,
        inspectorNotes,
        digitalSignature: digitalSignature || `${session?.user?.name || 'Inspector'} - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
        itemResults: Object.entries(formData).map(([itemId, data]) => ({
          qcFormTemplateItemId: itemId,
          resultValue: data.value?.toString() || '',
          isConformant: data.passed,
          notes: data.notes,
          isNotApplicable: data.isNotApplicable || false
        }))
      }

      if (onSubmit) {
        await onSubmit(submissionData)
      } else {
        const response = await nextJsApiClient.post(`/orders/${orderId}/qc`, submissionData)
        
        if (response.data.success) {
          toast({
            title: "QC Inspection Complete",
            description: `QC inspection completed with result: ${calculatedResult}`
          })
          router.push(`/orders/${orderId}`)
        }
      }
    } catch (error: any) {
      console.error('Error submitting QC form:', error)
      toast({
        title: "Submission Error",
        description: error.response?.data?.message || "Failed to submit QC inspection",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || externalLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading QC template...</span>
      </div>
    )
  }

  if (!template) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No QC template found for this order. Please contact system administrator.
        </AlertDescription>
      </Alert>
    )
  }

  const sectionGroups = groupItemsBySection(template.items)
  const overallResultCalculated = calculateOverallResult()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                {template.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  PO: {orderData?.poNumber}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {orderData?.customerName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(), 'MMM dd, yyyy')}
                </span>
              </CardDescription>
            </div>
            <Badge variant={overallResultCalculated === 'PASSED' ? 'default' : 'destructive'}>
              Current Result: {overallResultCalculated}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* QC Form Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Checklist</CardTitle>
          <CardDescription>
            Complete all applicable checklist items. Mark items as N/A if they don't apply to this configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={Object.keys(sectionGroups)[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-auto overflow-x-auto">
              {Object.keys(sectionGroups).map((section) => (
                <TabsTrigger key={section} value={section} className="text-xs">
                  {section}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(sectionGroups).map(([section, items]) => (
              <TabsContent key={section} value={section} className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{section}</h3>
                  {items
                    .sort((a, b) => a.order - b.order)
                    .map(item => renderFormField(item))
                  }
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Inspector Notes and Digital Signature */}
      <Card>
        <CardHeader>
          <CardTitle>Inspector Sign-off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inspector-notes">Overall Inspection Notes</Label>
            <Textarea
              id="inspector-notes"
              value={inspectorNotes}
              onChange={(e) => setInspectorNotes(e.target.value)}
              placeholder="Enter any overall observations or notes about this inspection..."
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="digital-signature">Digital Signature</Label>
            <Input
              id="digital-signature"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              placeholder={`${session?.user?.name || 'Inspector'} - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`}
            />
            <p className="text-xs text-muted-foreground">
              By submitting this form, I verify that this inspection has been completed according to standards.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {/* TODO: Implement save draft */}}
            disabled={submitting || saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Progress
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={overallResultCalculated === 'FAILED' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit QC Inspection
          </Button>
        </div>
      </div>
    </div>
  )
}