"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  CheckCircle,
  AlertCircle,
  FileText,
  Package,
  Settings,
  ClipboardCheck,
  Camera,
  RefreshCw,
  Save,
  UserCheck
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface ChecklistItem {
  id: string
  section: string
  description: string
  type: 'boolean' | 'text' | 'measurement' | 'dropdown' | 'na_option'
  required: boolean
  isBasinSpecific?: boolean
  basinNumber?: number
  options?: string[]
  completed: boolean
  value?: string | boolean
  notes?: string
  applicableBasins?: number[]
}

interface ProductionChecklistData {
  orderId: string
  buildNumber?: string
  jobId: string
  numberOfBasins: number
  performedBy: string
  performedByInitials: string
  timestamp: string
  sections: {
    preProduction: ChecklistItem[]
    sinkProduction: ChecklistItem[]
    basinProduction: ChecklistItem[]
    standardPackaging: ChecklistItem[]
  }
  overallStatus: 'incomplete' | 'complete' | 'approved'
  digitalSignature?: string
}

interface ProductionChecklistInterfaceProps {
  orderId: string
  buildNumber?: string
  orderConfiguration?: any
  onComplete?: (data: ProductionChecklistData) => void
  readonly?: boolean
}

export function ProductionChecklistInterface({ 
  orderId, 
  buildNumber, 
  orderConfiguration,
  onComplete,
  readonly = false
}: ProductionChecklistInterfaceProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [checklistData, setChecklistData] = useState<ProductionChecklistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<string>("pre-production")
  const [completionProgress, setCompletionProgress] = useState(0)

  useEffect(() => {
    initializeChecklist()
  }, [orderId, buildNumber, orderConfiguration])

  const initializeChecklist = async () => {
    try {
      setLoading(true)
      
      // Try to load existing checklist data
      const existingResponse = await nextJsApiClient.get(`/production/checklist/${orderId}${buildNumber ? `/${buildNumber}` : ''}`)
      
      if (existingResponse.data.success && existingResponse.data.data) {
        setChecklistData(existingResponse.data.data)
      } else {
        // Generate new checklist based on order configuration
        const newChecklist = generateChecklistFromConfiguration(orderConfiguration)
        setChecklistData(newChecklist)
      }
      
      calculateProgress()
    } catch (error) {
      console.error('Error initializing checklist:', error)
      // Generate default checklist if API fails
      const defaultChecklist = generateChecklistFromConfiguration(orderConfiguration)
      setChecklistData(defaultChecklist)
    } finally {
      setLoading(false)
    }
  }

  const generateChecklistFromConfiguration = (config: any): ProductionChecklistData => {
    const numberOfBasins = config?.numberOfBasins || 1
    const hasEDrain = config?.basins?.some((basin: any) => basin.type === 'E-Drain') || false
    const hasESink = config?.basins?.some((basin: any) => basin.type === 'E-Sink') || false
    const hasPegboard = config?.hasPegboard || false

    return {
      orderId,
      buildNumber: buildNumber || '',
      jobId: '',
      numberOfBasins,
      performedBy: session?.user?.name || '',
      performedByInitials: session?.user?.email?.substring(0, 2).toUpperCase() || '',
      timestamp: new Date().toISOString(),
      sections: {
        preProduction: generatePreProductionChecks(config, numberOfBasins),
        sinkProduction: generateSinkProductionChecks(config),
        basinProduction: generateBasinProductionChecks(config, numberOfBasins),
        standardPackaging: generateStandardPackagingChecks(config, numberOfBasins)
      },
      overallStatus: 'incomplete'
    }
  }

  const generatePreProductionChecks = (config: any, numberOfBasins: number): ChecklistItem[] => {
    const checks: ChecklistItem[] = [
      {
        id: 'check-dimensions',
        section: 'PRE-PRODUCTION CHECK',
        description: 'Check Final Sink Dimensions, basin dimensions, & BOM',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'attach-documents',
        section: 'PRE-PRODUCTION CHECK',
        description: 'Attach the final approved drawing and paperwork',
        type: 'boolean',
        required: true,
        completed: false
      }
    ]

    // Add pegboard check if applicable
    if (config?.hasPegboard) {
      checks.push({
        id: 'pegboard-installed',
        section: 'PRE-PRODUCTION CHECK',
        description: 'Pegboard installed – dimensions match drawing',
        type: 'boolean',
        required: true,
        completed: false
      })
    }

    checks.push({
      id: 'faucet-holes',
      section: 'PRE-PRODUCTION CHECK',
      description: 'Location of sink faucet holes and mounting holes match drawing/customer order requirements',
      type: 'boolean',
      required: true,
      completed: false
    })

    checks.push({
      id: 'mobility-components',
      section: 'PRE-PRODUCTION CHECK',
      description: 'Sink has proper mobility components',
      type: 'dropdown',
      required: true,
      options: ['Lock & levelling castors', 'Levelling Feet'],
      completed: false
    })

    // Add basin-specific checks
    for (let i = 1; i <= numberOfBasins; i++) {
      checks.push(
        {
          id: `basin-${i}-bottom-fill`,
          section: 'PRE-PRODUCTION CHECK',
          description: 'Bottom fill hole',
          type: 'boolean',
          required: true,
          isBasinSpecific: true,
          basinNumber: i,
          completed: false
        },
        {
          id: `basin-${i}-drain-button`,
          section: 'PRE-PRODUCTION CHECK',
          description: 'Drain Button',
          type: 'boolean',
          required: true,
          isBasinSpecific: true,
          basinNumber: i,
          completed: false
        },
        {
          id: `basin-${i}-basin-light`,
          section: 'PRE-PRODUCTION CHECK',
          description: 'Basin Light',
          type: 'na_option',
          required: false,
          isBasinSpecific: true,
          basinNumber: i,
          completed: false
        },
        {
          id: `basin-${i}-drain-location`,
          section: 'PRE-PRODUCTION CHECK',
          description: 'Drain Location',
          type: 'dropdown',
          required: true,
          options: ['Center', 'Other'],
          isBasinSpecific: true,
          basinNumber: i,
          completed: false
        }
      )
    }

    return checks
  }

  const generateSinkProductionChecks = (config: any): ChecklistItem[] => {
    const checks: ChecklistItem[] = [
      {
        id: 'overhead-led-bracket',
        section: 'SINK PRODUCTION CHECK',
        description: 'Sink Overhead LED Light Bracket is mounted with plastic washers (if there is a Pegboard)',
        type: config?.hasPegboard ? 'boolean' : 'na_option',
        required: config?.hasPegboard || false,
        completed: false
      },
      {
        id: 'overhead-led-button',
        section: 'SINK PRODUCTION CHECK',
        description: 'Sink Overhead LED Light button lasered and installed',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'standard-basin-faucets',
        section: 'SINK PRODUCTION CHECK',
        description: 'Standard Basin Faucets installed',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'lifters-control-button',
        section: 'SINK PRODUCTION CHECK',
        description: 'Lifters Control Button Installed',
        type: 'dropdown',
        required: true,
        options: ['DPF1K (Non-Programmable)', 'DP1C (Programmable)'],
        completed: false
      },
      {
        id: 'lifter-controller',
        section: 'SINK PRODUCTION CHECK',
        description: 'Lifter Controller Installed underneath the sink',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'torvan-logo',
        section: 'SINK PRODUCTION CHECK',
        description: 'Torvan Logo attached on left side of sink',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'power-bar',
        section: 'SINK PRODUCTION CHECK',
        description: 'Power Bar is installed',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'control-boxes',
        section: 'SINK PRODUCTION CHECK',
        description: 'Installed necessary control boxes (E-Drain, E-Sink)',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'cable-labeling',
        section: 'SINK PRODUCTION CHECK',
        description: 'All cables are labelled with \'D#\' or \'S#\'. Overhead Light cables labelled L4 & S4',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'sink-cleanliness',
        section: 'SINK PRODUCTION CHECK',
        description: 'Sink is clean of metal shavings, and waste',
        type: 'na_option',
        required: false,
        completed: false
      }
    ]

    // Add extras if configured
    if (config?.accessories?.some((acc: any) => acc.includes('AIR_GUN'))) {
      checks.push({
        id: 'air-gun-components',
        section: 'EXTRAS',
        description: 'Air Gun components (BL-4350-01 and BL-5500-07) installed',
        type: 'na_option',
        required: false,
        completed: false
      })
    }

    if (config?.accessories?.some((acc: any) => acc.includes('WATER_GUN'))) {
      checks.push({
        id: 'water-gun-components',
        section: 'EXTRAS',
        description: 'Water Gun components (BL-4500-02 and BL-4249) installed',
        type: 'na_option',
        required: false,
        completed: false
      })
    }

    return checks
  }

  const generateBasinProductionChecks = (config: any, numberOfBasins: number): ChecklistItem[] => {
    const checks: ChecklistItem[] = []
    
    // Generate checks for each basin based on its type
    for (let i = 1; i <= numberOfBasins; i++) {
      const basinConfig = config?.basins?.[i - 1]
      const basinType = basinConfig?.type || 'E-Drain'

      if (basinType === 'E-Drain') {
        checks.push(
          {
            id: `basin-${i}-edrain-mixing-valve`,
            section: 'E-DRAIN BASIN CHECKS',
            description: 'Installed Bottom-Fill Mixing Valve & Faucet',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-edrain-bottom-fill`,
            section: 'E-DRAIN BASIN CHECKS',
            description: 'Bottom Fill Assembly installed: Mixing Valve → 1/2" Male NPT to 3/4BSPP adapter → Check valve → ½" PEX Adaptor → ½" PEX Piping → Bottom Fill hole',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-edrain-pipe-labels`,
            section: 'E-DRAIN BASIN CHECKS',
            description: 'Pipes labelled as Hot Water and Cold Water',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-edrain-overflow`,
            section: 'E-DRAIN BASIN CHECKS',
            description: 'Overflow sensor installed',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          }
        )
      }

      if (basinType === 'E-Sink' || basinType === 'E-Sink DI') {
        checks.push(
          {
            id: `basin-${i}-esink-mixing-plate`,
            section: 'E-SINK BASIN CHECKS',
            description: 'Mixing Valve plate is installed',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-esink-emergency-stop`,
            section: 'E-SINK BASIN CHECKS',
            description: 'Emergency Stop buttons installed',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-esink-touchscreen-mount`,
            section: 'E-SINK BASIN CHECKS',
            description: 'E-Sink touchscreen mounted onto Sink',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-esink-touchscreen-connect`,
            section: 'E-SINK BASIN CHECKS',
            description: 'E-Sink touchscreen mounted onto Sink and connected to E-Sink Control Box',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-esink-overflow`,
            section: 'E-SINK BASIN CHECKS',
            description: 'Overflow sensor installed',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-esink-dosing-port`,
            section: 'E-SINK BASIN CHECKS',
            description: 'Install dosing port on backsplash',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          },
          {
            id: `basin-${i}-esink-temp-cable`,
            section: 'E-SINK BASIN CHECKS',
            description: 'Install basin temperature cable gland on backsplash',
            type: 'boolean',
            required: true,
            isBasinSpecific: true,
            basinNumber: i,
            completed: false
          }
        )
      }
    }

    return checks
  }

  const generateStandardPackagingChecks = (config: any, numberOfBasins: number): ChecklistItem[] => {
    return [
      {
        id: 'anti-fatigue-mat',
        section: 'STANDARD ITEMS',
        description: 'Anti-Fatigue Mat',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'sink-strainer',
        section: 'STANDARD ITEMS',
        description: 'Sink strainer per sink bowl (lasered with Torvan Medical logo)',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'flex-hose',
        section: 'STANDARD ITEMS',
        description: 'Ø1.5 Flex Hose (4ft) per sink drain + 2x Hose Clamps',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'temp-sensor',
        section: 'STANDARD ITEMS',
        description: '1x Temp. Sensor packed per E-Drain basin',
        type: 'boolean',
        required: config?.basins?.some((basin: any) => basin.type === 'E-Drain') || false,
        completed: false
      },
      {
        id: 'drain-solenoid',
        section: 'STANDARD ITEMS',
        description: '1x Electronic Drain Solenoid per Basin (Wired, tested and labelled)',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'drain-assembly',
        section: 'STANDARD ITEMS',
        description: '1x Drain assembly per basin',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'dosing-shelf',
        section: 'STANDARD ITEMS',
        description: '1x shelf for dosing pump',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'tubeset',
        section: 'STANDARD ITEMS',
        description: '1x Tubeset per dosing pump',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'drain-gasket',
        section: 'STANDARD ITEMS',
        description: 'Drain gasket per basin',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'install-manual-en',
        section: 'STANDARD ITEMS',
        description: 'Install & Operations Manual: IFU.T2.SinkInstUser',
        type: 'boolean',
        required: true,
        completed: false
      },
      {
        id: 'install-manual-fr',
        section: 'STANDARD ITEMS',
        description: 'Install & Operations Manual French: IFU.T2.SinkInstUserFR',
        type: 'na_option',
        required: false,
        completed: false
      },
      {
        id: 'esink-manual-fr',
        section: 'STANDARD ITEMS',
        description: 'E-Sink Automation Manual French: IFU.T2.ESinkInstUserFR',
        type: 'na_option',
        required: false,
        completed: false
      }
    ]
  }

  const calculateProgress = () => {
    if (!checklistData) return

    const allItems = [
      ...checklistData.sections.preProduction,
      ...checklistData.sections.sinkProduction,
      ...checklistData.sections.basinProduction,
      ...checklistData.sections.standardPackaging
    ]

    const completedItems = allItems.filter(item => item.completed).length
    const totalItems = allItems.length
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    setCompletionProgress(progress)
  }

  const handleItemUpdate = (sectionKey: keyof ProductionChecklistData['sections'], itemId: string, updates: Partial<ChecklistItem>) => {
    if (!checklistData || readonly) return

    setChecklistData(prev => {
      if (!prev) return prev

      const updatedSections = {
        ...prev.sections,
        [sectionKey]: prev.sections[sectionKey].map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      }

      return {
        ...prev,
        sections: updatedSections
      }
    })

    // Recalculate progress after state update
    setTimeout(calculateProgress, 0)
  }

  const handleSaveChecklist = async () => {
    if (!checklistData) return

    setSaving(true)
    try {
      const response = await nextJsApiClient.post('/production/checklist', {
        ...checklistData,
        timestamp: new Date().toISOString()
      })

      if (response.data.success) {
        toast({
          title: "Checklist Saved",
          description: "Production checklist has been saved successfully"
        })
      }
    } catch (error) {
      console.error('Error saving checklist:', error)
      toast({
        title: "Error",
        description: "Failed to save production checklist",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteChecklist = async () => {
    if (!checklistData || completionProgress < 100) return

    setSaving(true)
    try {
      const completedChecklist = {
        ...checklistData,
        overallStatus: 'complete' as const,
        digitalSignature: `${checklistData.performedByInitials}-${new Date().toISOString()}`,
        timestamp: new Date().toISOString()
      }

      const response = await nextJsApiClient.post('/production/checklist/complete', completedChecklist)

      if (response.data.success) {
        setChecklistData(completedChecklist)
        onComplete?.(completedChecklist)
        toast({
          title: "Checklist Complete",
          description: "Production checklist has been completed and signed off"
        })
      }
    } catch (error) {
      console.error('Error completing checklist:', error)
      toast({
        title: "Error",
        description: "Failed to complete production checklist",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const renderChecklistItem = (item: ChecklistItem, sectionKey: keyof ProductionChecklistData['sections']) => {
    const isNA = item.value === 'N/A'

    return (
      <div key={item.id} className="p-4 border rounded-lg space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {item.isBasinSpecific && (
                <Badge variant="outline" className="text-xs">
                  Basin {item.basinNumber}
                </Badge>
              )}
              {item.required && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
            </div>
            <Label className="text-sm font-medium">{item.description}</Label>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {item.type === 'na_option' && (
              <Checkbox
                checked={isNA}
                onCheckedChange={(checked) => {
                  if (readonly) return
                  handleItemUpdate(sectionKey, item.id, {
                    value: checked ? 'N/A' : false,
                    completed: checked ? true : false
                  })
                }}
                disabled={readonly}
              />
            )}
            {item.type === 'na_option' && <Label className="text-xs text-muted-foreground">N/A</Label>}
          </div>
        </div>

        {!isNA && (
          <div className="space-y-2">
            {item.type === 'boolean' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) => {
                    if (readonly) return
                    handleItemUpdate(sectionKey, item.id, { 
                      completed: checked as boolean,
                      value: checked
                    })
                  }}
                  disabled={readonly}
                />
                <Label className="text-sm">Completed</Label>
              </div>
            )}

            {item.type === 'dropdown' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Selection:</Label>
                <select
                  value={item.value as string || ''}
                  onChange={(e) => {
                    if (readonly) return
                    handleItemUpdate(sectionKey, item.id, {
                      value: e.target.value,
                      completed: !!e.target.value
                    })
                  }}
                  className="w-full p-2 border rounded text-sm"
                  disabled={readonly}
                >
                  <option value="">Select option...</option>
                  {item.options?.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}

            {item.type === 'text' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Value:</Label>
                <Input
                  value={item.value as string || ''}
                  onChange={(e) => {
                    if (readonly) return
                    handleItemUpdate(sectionKey, item.id, {
                      value: e.target.value,
                      completed: !!e.target.value
                    })
                  }}
                  disabled={readonly}
                  className="text-sm"
                />
              </div>
            )}

            {item.type === 'measurement' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Measurement:</Label>
                <div className="flex gap-2">
                  <Input
                    value={item.value as string || ''}
                    onChange={(e) => {
                      if (readonly) return
                      handleItemUpdate(sectionKey, item.id, {
                        value: e.target.value,
                        completed: !!e.target.value
                      })
                    }}
                    disabled={readonly}
                    className="text-sm"
                    placeholder="Enter measurement"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes (optional):</Label>
              <Textarea
                value={item.notes || ''}
                onChange={(e) => {
                  if (readonly) return
                  handleItemUpdate(sectionKey, item.id, { notes: e.target.value })
                }}
                disabled={readonly}
                className="text-sm"
                rows={2}
                placeholder="Add any additional notes..."
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSection = (title: string, items: ChecklistItem[], sectionKey: keyof ProductionChecklistData['sections'], icon: any) => {
    const completedItems = items.filter(item => item.completed).length
    const totalItems = items.length
    const sectionProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {completedItems}/{totalItems}
            </Badge>
            <Badge className={sectionProgress === 100 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
              {Math.round(sectionProgress)}%
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {items.map(item => renderChecklistItem(item, sectionKey))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading production checklist...</span>
        </div>
      </div>
    )
  }

  if (!checklistData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Failed to load production checklist data
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Production Checklist - CLP.T2.001.V01
              </CardTitle>
              <CardDescription>
                Digital implementation of T2 Sink Production checklist
                {buildNumber && ` for Build #${buildNumber}`}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="px-3 py-1">
                {Math.round(completionProgress)}% Complete
              </Badge>
              {checklistData.overallStatus === 'complete' && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Job ID:</Label>
              <Input
                value={checklistData.jobId}
                onChange={(e) => {
                  if (readonly) return
                  setChecklistData(prev => prev ? { ...prev, jobId: e.target.value } : prev)
                }}
                disabled={readonly}
                placeholder="Enter Job ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground"># of Basins:</Label>
              <div className="mt-1 font-medium">{checklistData.numberOfBasins}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Performed By:</Label>
              <div className="mt-1 font-medium">{checklistData.performedBy}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Initials:</Label>
              <Input
                value={checklistData.performedByInitials}
                onChange={(e) => {
                  if (readonly) return
                  setChecklistData(prev => prev ? { ...prev, performedByInitials: e.target.value } : prev)
                }}
                disabled={readonly}
                className="mt-1"
                maxLength={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Sections */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pre-production">Pre-Production</TabsTrigger>
          <TabsTrigger value="sink-production">Sink Production</TabsTrigger>
          <TabsTrigger value="basin-production">Basin Production</TabsTrigger>
          <TabsTrigger value="packaging">Packaging</TabsTrigger>
        </TabsList>

        <TabsContent value="pre-production" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {renderSection(
                "Section 1: Pre-Production Check",
                checklistData.sections.preProduction,
                'preProduction',
                <FileText className="w-5 h-5" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sink-production" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {renderSection(
                "Section 2: Sink Production Check",
                checklistData.sections.sinkProduction,
                'sinkProduction',
                <Settings className="w-5 h-5" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basin-production" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {renderSection(
                "Section 3: Basin Production",
                checklistData.sections.basinProduction,
                'basinProduction',
                <Package className="w-5 h-5" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packaging" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {renderSection(
                "Section 4: Standard Packaging & Kits",
                checklistData.sections.standardPackaging,
                'standardPackaging',
                <Package className="w-5 h-5" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      {!readonly && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Checklist Actions</h4>
                <p className="text-sm text-muted-foreground">
                  {completionProgress === 100 
                    ? 'All items completed - ready for digital sign-off'
                    : `${Math.round(100 - completionProgress)}% remaining to complete`
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={handleSaveChecklist}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
                  onClick={handleCompleteChecklist}
                  disabled={completionProgress < 100 || saving || checklistData.overallStatus === 'complete'}
                >
                  {checklistData.overallStatus === 'complete' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Complete & Sign Off
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Digital Signature */}
      {checklistData.digitalSignature && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-600" />
                <span className="font-medium">Digitally Signed</span>
              </div>
              <div className="text-muted-foreground">
                {checklistData.digitalSignature} • {checklistData.timestamp}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}