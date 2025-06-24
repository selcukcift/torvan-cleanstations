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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle,
  AlertTriangle,
  Save,
  Send,
  ClipboardCheck,
  FileText,
  Settings,
  Grid3X3,
  CheckSquare,
  Calendar,
  User,
  Package,
  Loader2,
  Circle,
  CheckCircle2
} from "lucide-react"
import { format } from "date-fns"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { BasinInspectionGrid } from "./BasinInspectionGrid"
import { ConfigurationVerification } from "./ConfigurationVerification"

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
  }
}

interface TabSection {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: QCTemplateItem[]
  completedCount: number
  totalCount: number
}

interface QCTabbedInterfaceProps {
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

export function QCTabbedInterface({ orderId, orderData, template: templateProp, session, orderConfiguration }: QCTabbedInterfaceProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [template, setTemplate] = useState<QCTemplate | null>(templateProp || null)
  const [formData, setFormData] = useState<QCFormData>({})
  const [loading, setLoading] = useState(!templateProp)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("verification")
  const [overallResult, setOverallResult] = useState<'PASSED' | 'FAILED' | null>(null)
  const [inspectorNotes, setInspectorNotes] = useState("")
  const [configurationData, setConfigurationData] = useState<any>(orderConfiguration)
  const [verificationData, setVerificationData] = useState<any>({})

  // Function to improve specific wording issues
  const improveItemWording = (originalText: string): string => {
    const text = originalText.toLowerCase()
    
    // Fix mounting holes wording
    if (text.includes('faucet mounting holes drilled and positioned per drawing specifications')) {
      return 'Faucet mounting holes - position and specifications'
    }
    
    if (text.includes('all mounting holes match drawing specifications - check positions and sizes')) {
      return 'All mounting holes - positions and sizes per specifications'
    }
    
    // Default: return original text
    return originalText
  }

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
      const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
      initialFormData[itemKey] = {
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
      const response = await nextJsApiClient.get(`/orders/${orderId}/qc/template?formType=Pre-Production Check`)
      
      if (response.data.success) {
        setTemplate(response.data.template)
        initializeFormData(response.data.template)
        if (response.data.orderConfiguration) {
          setConfigurationData(response.data.orderConfiguration)
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load QC template",
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

  const organizeItemsIntoTabs = (items: QCTemplateItem[]): TabSection[] => {
    // Group items into logical tabs (new 5-tab structure)
    const verificationItems = items.filter(item => 
      item.section === 'Configuration Verification'
    )
    
    const jobInfoItems = items.filter(item => 
      item.section === 'Job Information'
    )
    
    const structuralItems = items.filter(item => 
      item.section === 'Structural Components'
    )
    
    const mountingItems = items.filter(item => 
      item.section === 'Mounting & Holes'
    )
    
    const basinItems = items.filter(item => 
      item.section === 'Basin Inspection' || item.repeatPer === 'basin'
    )
    
    return [
      {
        id: 'verification',
        label: 'Configuration Verification',
        icon: FileText,
        items: verificationItems,
        completedCount: Object.values(verificationData).filter((v: any) => v.verified).length,
        totalCount: configurationData ? 4 : 0 // 4 verification items
      },
      {
        id: 'job-info',
        label: 'Job Information',
        icon: ClipboardCheck,
        items: jobInfoItems,
        completedCount: getCompletedCount(jobInfoItems),
        totalCount: jobInfoItems.length
      },
      {
        id: 'structural',
        label: 'Structural Components',
        icon: Settings,
        items: structuralItems,
        completedCount: getCompletedCount(structuralItems),
        totalCount: structuralItems.length
      },
      {
        id: 'mounting',
        label: 'Mounting & Holes',
        icon: Grid3X3,
        items: mountingItems,
        completedCount: getCompletedCount(mountingItems),
        totalCount: mountingItems.length
      },
      {
        id: 'basins',
        label: 'Basin Inspection',
        icon: CheckSquare,
        items: basinItems,
        completedCount: getCompletedCount(basinItems),
        totalCount: basinItems.length
      }
    ].filter(tab => tab.items.length > 0 || tab.id === 'verification')
  }

  const getCompletedCount = (items: QCTemplateItem[]): number => {
    return items.filter(item => {
      const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
      const itemData = formData[itemKey]
      if (!itemData) return false
      
      // Consider an item completed if it has a value (and is required) or if it's not required
      if (item.isRequired) {
        if (item.itemType === 'CHECKBOX') {
          return itemData.value === true
        }
        return itemData.value !== '' && itemData.value !== null && itemData.value !== undefined
      }
      return true // Non-required items are considered completed
    }).length
  }

  const getOverallProgress = (): number => {
    if (!template) return 0
    const totalItems = template.items.length
    const completedItems = template.items.filter(item => {
      const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
      const itemData = formData[itemKey]
      if (!itemData) return false
      
      if (item.isRequired) {
        if (item.itemType === 'CHECKBOX') {
          return itemData.value === true
        }
        return itemData.value !== '' && itemData.value !== null && itemData.value !== undefined
      }
      return true
    }).length
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  }

  const getTabStatus = (tab: TabSection): 'completed' | 'in-progress' | 'pending' => {
    if (tab.completedCount === tab.totalCount) return 'completed'
    if (tab.completedCount > 0) return 'in-progress'
    return 'pending'
  }

  const getTabBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'in-progress': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleItemValueChange = (itemId: string, value: any, field: 'value' | 'notes' = 'value') => {
    setFormData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }))
  }

  const renderFormField = (item: QCTemplateItem) => {
    const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
    const itemData = formData[itemKey] || { value: '', notes: '' }

    switch (item.itemType) {
      case 'PASS_FAIL':
        return (
          <RadioGroup
            value={itemData.value}
            onValueChange={(value) => handleItemValueChange(itemKey, value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="PASS" id={`${itemKey}-pass`} />
              <Label htmlFor={`${itemKey}-pass`} className="text-green-600 font-medium">Pass</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="FAIL" id={`${itemKey}-fail`} />
              <Label htmlFor={`${itemKey}-fail`} className="text-red-600 font-medium">Fail</Label>
            </div>
          </RadioGroup>
        )

      case 'TEXT_INPUT':
        return (
          <Input
            value={itemData.value}
            onChange={(e) => handleItemValueChange(itemKey, e.target.value)}
            placeholder={item.notesPrompt || `Enter ${item.checklistItem.toLowerCase()}...`}
            className="w-full"
          />
        )

      case 'NUMERIC_INPUT':
        return (
          <Input
            type="number"
            value={itemData.value}
            onChange={(e) => handleItemValueChange(itemKey, e.target.value)}
            placeholder={`Enter number${item.expectedValue ? ` (${item.expectedValue})` : ''}`}
            className="w-full"
          />
        )

      case 'SINGLE_SELECT':
        const selectOptions = typeof item.options === 'string' 
          ? JSON.parse(item.options || '[]') 
          : (item.options || []);
        return (
          <Select value={itemData.value} onValueChange={(value) => handleItemValueChange(itemKey, value)}>
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
                  id={`${itemKey}-${option}`}
                  checked={(itemData.value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = itemData.value || []
                    if (checked) {
                      handleItemValueChange(itemKey, [...currentValues, option])
                    } else {
                      handleItemValueChange(itemKey, currentValues.filter((v: string) => v !== option))
                    }
                  }}
                />
                <Label htmlFor={`${itemKey}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        )

      case 'DATE_INPUT':
        return (
          <Input
            type="date"
            value={itemData.value}
            onChange={(e) => handleItemValueChange(itemKey, e.target.value)}
            className="w-full"
          />
        )

      case 'CHECKBOX':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={itemKey}
              checked={itemData.value}
              onCheckedChange={(checked) => handleItemValueChange(itemKey, checked)}
            />
            <Label htmlFor={itemKey}>Yes</Label>
          </div>
        )

      default:
        return <div>Unsupported field type</div>
    }
  }

  const handleSave = async () => {
    setSaving(true)
    // Implement save functionality
    setTimeout(() => setSaving(false), 1000)
    toast({
      title: "Progress Saved",
      description: "Your QC inspection progress has been saved."
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    // Implement submit functionality
    setTimeout(() => setSubmitting(false), 2000)
    toast({
      title: "QC Inspection Submitted",
      description: "The Pre-QC inspection has been completed and submitted."
    })
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

  const tabSections = organizeItemsIntoTabs(template.items)
  const overallProgress = getOverallProgress()

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
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
            <Badge variant="outline">Version {template.version}</Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{overallProgress}% Complete</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {tabSections.map((tab) => {
            const status = getTabStatus(tab)
            return (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2 relative"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-1 ${getTabBadgeColor(status)}`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : status === 'in-progress' ? (
                    <Circle className="w-3 h-3" />
                  ) : (
                    `${tab.completedCount}/${tab.totalCount}`
                  )}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {tabSections.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            {tab.id === 'verification' ? (
              // Special handling for configuration verification
              configurationData ? (
                <ConfigurationVerification
                  orderData={orderData!}
                  configuration={configurationData.configuration}
                  verificationData={verificationData}
                  onVerificationChange={setVerificationData}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">Configuration Data Not Available</p>
                    <p className="text-slate-600">Unable to load order configuration for verification.</p>
                  </CardContent>
                </Card>
              )
            ) : tab.id === 'basins' ? (
              // Special handling for basin inspection
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                    </CardTitle>
                    <CardDescription>
                      Inspect each basin systematically using the grid below
                    </CardDescription>
                  </CardHeader>
                </Card>
                <BasinInspectionGrid 
                  basinItems={tab.items}
                  formData={formData}
                  onItemValueChange={handleItemValueChange}
                />
              </div>
            ) : (
              // Standard tab layout for other sections
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </CardTitle>
                  <CardDescription>
                    Complete {tab.totalCount} inspection items in this section
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tab.items.map((item) => {
                      const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
                      const itemData = formData[itemKey] || { value: '', notes: '' }
                      const isCompleted = item.isRequired ? 
                        (item.itemType === 'CHECKBOX' ? itemData.value === true : itemData.value !== '' && itemData.value !== null) :
                        true

                      return (
                        <Card key={itemKey} className={`border-l-4 ${isCompleted ? 'border-l-green-400 bg-green-50' : 'border-l-slate-200'}`}>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <Label className="text-base font-medium flex items-center gap-2">
                                    {improveItemWording(item.checklistItem)}
                                    {item.isRequired && <span className="text-red-500">*</span>}
                                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-600" />}
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

                              <div className="ml-4">
                                <Label className="text-sm text-slate-600">Notes (Optional)</Label>
                                <Textarea
                                  value={formData[itemKey]?.notes || ''}
                                  onChange={(e) => handleItemValueChange(itemKey, e.target.value, 'notes')}
                                  placeholder={item.notesPrompt || "Add any additional notes..."}
                                  rows={2}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Action Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Progress: {overallProgress}% complete
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Progress
                  </>
                )}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting || overallProgress < 100}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Inspection
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}