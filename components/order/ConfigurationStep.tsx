"use client"

import { useState, useEffect } from "react"
import { 
  Package, 
  Droplets, 
  Check,
  ChevronRight,
  Plus,
  Minus,
  AlertCircle,
  Info,
  ShowerHead,
  Waves,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { nextJsApiClient } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CopyConfiguration } from "./CopyConfiguration"

interface ConfigurationStepProps {
  buildNumbers: string[]
  onComplete?: () => void
}

// Section configuration
const SECTIONS = [
  { id: 'sink-body', label: 'Sink Body', icon: Package, required: true },
  { id: 'basins', label: 'Basins', icon: Droplets, required: true },
  { id: 'faucets', label: 'Faucets', icon: ShowerHead, required: false },
  { id: 'sprayers', label: 'Sprayers', icon: Waves, required: false },
]

export default function ConfigurationStep({ buildNumbers, onComplete }: ConfigurationStepProps) {
  const { configurations, updateSinkConfiguration, customerInfo, sinkSelection, accessories } = useOrderCreateStore()
  const [currentBuildIndex, setCurrentBuildIndex] = useState(0)
  const [activeSection, setActiveSection] = useState('sink-body')
  
  // API States
  const [sinkModels, setSinkModels] = useState<any[]>([])
  const [legsOptions, setLegsOptions] = useState<any[]>([])
  const [feetOptions, setFeetOptions] = useState<any[]>([])
  const [pegboardOptions, setPegboardOptions] = useState<any>({})
  const [basinTypes, setBasinTypes] = useState<any[]>([])
  const [basinSizeOptions, setBasinSizeOptions] = useState<any>({})
  const [basinAddons, setBasinAddons] = useState<any[]>([])
  const [faucetTypes, setFaucetTypes] = useState<any[]>([])
  const [sprayerTypes, setSprayerTypes] = useState<any[]>([])
  const [controlBox, setControlBox] = useState<any>(null)
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [pegboardLoading, setPegboardLoading] = useState(false)
  const [controlBoxLoading, setControlBoxLoading] = useState(false)
  
  // Debug helper state

  const currentBuildNumber = buildNumbers[currentBuildIndex]
  const currentConfig = configurations[currentBuildNumber] || {}

  const updateConfig = (updates: any) => {
    if (currentBuildNumber) {
      updateSinkConfiguration(currentBuildNumber, updates)
    }
  }

  const handleCopyConfiguration = (sourceBuildNumber: string, targetBuildNumber: string) => {
    const sourceConfig = configurations[sourceBuildNumber]
    if (sourceConfig && targetBuildNumber) {
      // Deep clone the configuration to avoid reference issues
      const clonedConfig = JSON.parse(JSON.stringify(sourceConfig))
      
      // Generate new IDs for basins, faucets, and sprayers to avoid conflicts
      if (clonedConfig.basins) {
        clonedConfig.basins = clonedConfig.basins.map((basin: any) => ({
          ...basin,
          id: `basin-${Date.now()}-${Math.random()}`
        }))
      }
      
      if (clonedConfig.faucets) {
        clonedConfig.faucets = clonedConfig.faucets.map((faucet: any) => ({
          ...faucet,
          id: `faucet-${Date.now()}-${Math.random()}`
        }))
      }
      
      if (clonedConfig.sprayers) {
        clonedConfig.sprayers = clonedConfig.sprayers.map((sprayer: any) => ({
          ...sprayer,
          id: `sprayer-${Date.now()}-${Math.random()}`
        }))
      }
      
      updateSinkConfiguration(targetBuildNumber, clonedConfig)
    }
  }

  // Initialize configuration
  useEffect(() => {
    if (currentBuildNumber && !configurations[currentBuildNumber]) {
      updateSinkConfiguration(currentBuildNumber, {
        sinkModelId: '',
        width: null,
        length: null,
        legsTypeId: '',
        feetTypeId: '',
        pegboard: false,
        pegboardTypeId: '',
        pegboardColorId: '',
        hasDrawersAndCompartments: false,
        drawersAndCompartments: [],
        workflowDirection: 'LEFT_TO_RIGHT',
        basins: [],
        faucets: [],
        sprayers: [],
        controlBoxId: null
      })
    }
  }, [currentBuildNumber, configurations, updateSinkConfiguration])

  // Load initial data
  useEffect(() => {
    loadInitialData()
    loadPegboardOptions()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [
        sinkModelsRes,
        legsRes,
        feetRes,
        basinTypesRes,
        basinAddonsRes,
        faucetTypesRes,
        sprayerTypesRes
      ] = await Promise.all([
        nextJsApiClient.get('/configurator?queryType=sinkModels'),
        nextJsApiClient.get('/configurator?queryType=legTypes'),
        nextJsApiClient.get('/configurator?queryType=feetTypes'),
        nextJsApiClient.get('/configurator?queryType=basinTypes'),
        nextJsApiClient.get('/configurator?queryType=basinTypes'), // No separate addon endpoint
        nextJsApiClient.get('/configurator?queryType=faucetTypes'),
        nextJsApiClient.get('/configurator?queryType=sprayerTypes')
      ])

      setSinkModels(sinkModelsRes.data.data || [])
      setLegsOptions(legsRes.data.data || [])
      setFeetOptions(feetRes.data.data || [])
      setBasinTypes(basinTypesRes.data.data || [])
      setBasinAddons(basinAddonsRes.data.data || [])
      setFaucetTypes(faucetTypesRes.data.data?.options || [])
      setSprayerTypes(sprayerTypesRes.data.data || [])
    } catch (error) {
      console.error('Error loading configuration data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load basin size options when basins change
  useEffect(() => {
    if (currentConfig.basins?.length > 0) {
      loadBasinSizeOptions()
    }
  }, [currentConfig.basins])

  // E-Sink DI Logic: Auto-add DI Gooseneck faucet when E_SINK_DI basin is selected
  useEffect(() => {
    const hasESinkDI = currentConfig.basins?.some((basin: any) => 
      basin.basinTypeId === 'E_SINK_DI' || basin.basinType === 'E_SINK_DI'
    )
    
    if (hasESinkDI) {
      const currentFaucets = currentConfig.faucets || []
      const hasDIGooseneck = currentFaucets.some((faucet: any) => 
        faucet.faucetTypeId === 'T2-OA-DI-GOOSENECK-FAUCET-KIT'
      )
      
      // If E_SINK_DI basin exists but no DI Gooseneck faucet, add one
      if (!hasDIGooseneck) {
        // Find the E_SINK_DI basin and place the faucet on it
        const eSinkDIBasinIndex = currentConfig.basins?.findIndex((basin: any) => 
          basin.basinTypeId === 'E_SINK_DI' || basin.basinType === 'E_SINK_DI'
        )
        // Use smart placement selection for E_SINK_DI basin
        const getESinkDIPlacement = () => {
          const placementOptions = getPlacementOptions(-1) // Get all available options
          
          // First try to place on the E_SINK_DI basin itself if it's a valid option
          if (eSinkDIBasinIndex >= 0) {
            const preferredPlacement = `BASIN_${eSinkDIBasinIndex + 1}`
            const isValidPlacement = placementOptions.some(opt => opt.value === preferredPlacement)
            if (isValidPlacement) {
              return preferredPlacement
            }
          }
          
          // Fallback to first available option
          return placementOptions.length > 0 ? placementOptions[0].value : 'BETWEEN_1_2'
        }
        
        const defaultPlacement = getESinkDIPlacement()
        
        const diGooseneckFaucet = {
          id: `faucet-di-${Date.now()}`,
          faucetTypeId: 'T2-OA-DI-GOOSENECK-FAUCET-KIT',
          placement: defaultPlacement,
          isMandatory: true // Mark as mandatory for UI indication
        }
        
        updateConfig({ 
          faucets: [...currentFaucets, diGooseneckFaucet]
        })
      }
    }
  }, [currentConfig.basins, faucetTypes])

  const loadBasinSizeOptions = async () => {
    try {
      const response = await nextJsApiClient.get('/configurator?queryType=basinSizes')
      setBasinSizeOptions(response.data.data || {})
    } catch (error) {
      console.error('Error loading basin size options:', error)
    }
  }

  // Load pegboard options on component mount
  useEffect(() => {
    loadPegboardOptions()
  }, [])

  const loadPegboardOptions = async () => {
    setPegboardLoading(true)
    try {
      const response = await nextJsApiClient.get('/configurator', {
        params: {
          queryType: 'pegboardOptions'
        }
      })
      setPegboardOptions(response.data.data || {})
    } catch (error) {
      console.error('Error loading pegboard options:', error)
    } finally {
      setPegboardLoading(false)
    }
  }

  const getSelectedModel = () => {
    return sinkModels.find(model => model.id === currentConfig.sinkModelId)
  }

  const getMaxBasins = () => {
    const model = getSelectedModel()
    return model ? model.basinCount : 1
  }

  const getMaxFaucets = () => {
    const basinCount = getMaxBasins()
    
    // Check if all basins are E-Drain
    const allBasinsAreEDrain = currentConfig.basins?.every((basin: any) => 
      basin.basinTypeId === 'E_DRAIN' || basin.basinType === 'E_DRAIN'
    )
    
    // E-Drain only configurations have limited faucet placement options
    if (allBasinsAreEDrain) {
      // For E-Drain basins, limit to number of between-basin positions
      // 2 basins = 1 faucet (between 1&2), 3 basins = 2 faucets (between 1&2, between 2&3)
      return Math.max(1, basinCount - 1)
    }
    
    // Standard business rules for mixed or non-E-Drain configurations
    // 1-2 basins = max 2 faucets, 3 basins = max 3 faucets
    return basinCount <= 2 ? 2 : 3
  }

  const getPlacementOptions = (currentFaucetIndex: number) => {
    const basinCount = currentConfig.basins?.length || 0
    const otherFaucets = currentConfig.faucets?.filter((_: any, i: number) => i !== currentFaucetIndex) || []
    const occupiedPlacements = otherFaucets.map((f: any) => f.placement)
    
    const options = []
    
    // Check basin types
    const hasEDrainBasin = currentConfig.basins?.some((basin: any) => 
      basin.basinTypeId === 'E_DRAIN' || basin.basinType === 'E_DRAIN'
    )
    
    const allBasinsAreEDrain = currentConfig.basins?.every((basin: any) => 
      basin.basinTypeId === 'E_DRAIN' || basin.basinType === 'E_DRAIN'
    )
    
    // For pure E-Drain configurations, only allow between-basin placements
    if (allBasinsAreEDrain && basinCount >= 2) {
      // E-Drain basins can only have faucets between basins, not on individual basins
      if (basinCount >= 2) {
        const between12 = 'BETWEEN_1_2'
        if (!occupiedPlacements.includes(between12)) {
          options.push({ value: between12, label: 'Between Basin 1 & 2', category: 'Between Basins' })
        }
      }
      
      if (basinCount >= 3) {
        const between23 = 'BETWEEN_2_3'
        if (!occupiedPlacements.includes(between23)) {
          options.push({ value: between23, label: 'Between Basin 2 & 3', category: 'Between Basins' })
        }
      }
      
      return options
    }
    
    // For mixed configurations or non-E-Drain basins, organize by category
    
    // Add "Center of Basin" options for non-E-Drain basins
    if (!allBasinsAreEDrain) {
      for (let i = 1; i <= basinCount; i++) {
        const basin = currentConfig.basins?.[i - 1]
        const isEDrain = basin?.basinTypeId === 'E_DRAIN' || basin?.basinType === 'E_DRAIN'
        
        // Only allow basin placement if it's not an E-Drain basin
        if (!isEDrain) {
          const basinValue = `BASIN_${i}`
          if (!occupiedPlacements.includes(basinValue)) {
            options.push({ 
              value: basinValue, 
              label: `Center of Basin ${i}`, 
              category: 'Center of Basin' 
            })
          }
        }
      }
    }
    
    // Add "Between Basins" options
    if (basinCount >= 2) {
      const between12 = 'BETWEEN_1_2'
      if (!occupiedPlacements.includes(between12)) {
        options.push({ 
          value: between12, 
          label: 'Between Basin 1 & 2', 
          category: 'Between Basins' 
        })
      }
    }
    
    if (basinCount >= 3) {
      const between23 = 'BETWEEN_2_3'
      if (!occupiedPlacements.includes(between23)) {
        options.push({ 
          value: between23, 
          label: 'Between Basin 2 & 3', 
          category: 'Between Basins' 
        })
      }
    }
    
    return options
  }

  // Helper function to get default placement for new faucet
  const getDefaultFaucetPlacement = () => {
    const options = getPlacementOptions(-1) // -1 means no current faucet to exclude
    return options.length > 0 ? options[0].value : 'BETWEEN_1_2'
  }

  // Validate and fix invalid faucet placements when basin configuration changes
  useEffect(() => {
    if (!currentConfig.faucets || currentConfig.faucets.length === 0) return

    let needsUpdate = false
    const updatedFaucets = currentConfig.faucets.map((faucet: any, index: number) => {
      const validOptions = getPlacementOptions(index)
      const isValidPlacement = validOptions.some(option => option.value === faucet.placement)
      
      if (!isValidPlacement) {
        needsUpdate = true
        // Use first available option or default
        const newPlacement = validOptions.length > 0 ? validOptions[0].value : 'BASIN_1'
        console.warn(`Invalid faucet placement "${faucet.placement}" fixed to "${newPlacement}"`)
        return { ...faucet, placement: newPlacement }
      }
      
      return faucet
    })

    if (needsUpdate) {
      updateConfig({ faucets: updatedFaucets })
    }
  }, [currentConfig.basins]) // Only depend on basins to avoid infinite loop

  const getSectionStatus = (sectionId: string) => {
    switch (sectionId) {
      case 'sink-body':
        return currentConfig.sinkModelId && currentConfig.width && currentConfig.length && 
               currentConfig.legsTypeId && currentConfig.feetTypeId ? 'complete' : 'incomplete'
      case 'basins':
        const expectedBasins = getMaxBasins()
        const hasAllBasins = currentConfig.basins?.length === expectedBasins
        const allBasinsConfigured = currentConfig.basins?.every((b: any) => b.basinType && b.basinSizePartNumber)
        return hasAllBasins && allBasinsConfigured ? 'complete' : 'incomplete'
      case 'faucets':
        return currentConfig.faucets?.length > 0 ? 'complete' : 'optional'
      case 'sprayers':
        return currentConfig.sprayers?.length > 0 ? 'complete' : 'optional'
      default:
        return 'incomplete'
    }
  }

  const getNextSection = (currentSection: string) => {
    const currentIndex = SECTIONS.findIndex(s => s.id === currentSection)
    return currentIndex < SECTIONS.length - 1 ? SECTIONS[currentIndex + 1].id : null
  }

  const getPrevSection = (currentSection: string) => {
    const currentIndex = SECTIONS.findIndex(s => s.id === currentSection)
    return currentIndex > 0 ? SECTIONS[currentIndex - 1].id : null
  }

  const canProceedToNext = (sectionId: string) => {
    const status = getSectionStatus(sectionId)
    const section = SECTIONS.find(s => s.id === sectionId)
    return status === 'complete' || (status === 'optional' && !section?.required)
  }

  const isAllConfigurationComplete = () => {
    // Check if all required sections are complete for all build numbers
    const requiredSections = SECTIONS.filter(s => s.required)
    return buildNumbers.every(buildNumber => {
      const config = configurations[buildNumber] || {}
      return requiredSections.every(section => {
        const tempActiveSection = activeSection
        // Temporarily set the config to check status
        const status = getSectionStatusForConfig(section.id, config)
        return status === 'complete'
      })
    })
  }

  const getSectionStatusForConfig = (sectionId: string, config: any) => {
    switch (sectionId) {
      case 'sink-body':
        return config.sinkModelId && config.width && config.length && 
               config.legsTypeId && config.feetTypeId ? 'complete' : 'incomplete'
      case 'basins':
        // Need to determine expected basins from the config's sink model
        const sinkModel = sinkModels.find(m => m.id === config.sinkModelId)
        const expectedBasinCount = sinkModel?.basinCount || 1
        const hasAllBasinsForConfig = config.basins?.length === expectedBasinCount
        const allBasinsConfiguredForConfig = config.basins?.every((b: any) => b.basinType && b.basinSizePartNumber)
        return hasAllBasinsForConfig && allBasinsConfiguredForConfig ? 'complete' : 'incomplete'
      default:
        return 'incomplete'
    }
  }

  const goToNextSection = () => {
    const nextSection = getNextSection(activeSection)
    if (nextSection && canProceedToNext(activeSection)) {
      setActiveSection(nextSection)
    } else if (!nextSection && canProceedToNext(activeSection) && isAllConfigurationComplete() && onComplete) {
      // If we're on the last section and all configurations are complete, move to next step
      onComplete()
    }
  }

  const goToPrevSection = () => {
    const prevSection = getPrevSection(activeSection)
    if (prevSection) {
      setActiveSection(prevSection)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading configuration options...</p>
        </div>
      </div>
    )
  }

  if (!buildNumbers || buildNumbers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-slate-600 text-lg mb-2">No sinks to configure</p>
          <p className="text-slate-500 text-sm">Please complete the Sink Selection step first to add sinks for configuration.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-16rem)] flex gap-4">
      {/* Sidebar */}
      <div className="w-64 border-r bg-slate-50/50">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Configure {currentBuildNumber}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {currentBuildIndex + 1} of {buildNumbers.length} sinks
              </p>
            </div>
            {buildNumbers.length > 1 && (
              <CopyConfiguration
                buildNumbers={buildNumbers}
                currentBuildNumber={currentBuildNumber}
                configurations={configurations}
                onCopyConfiguration={handleCopyConfiguration}
              />
            )}
          </div>
        </div>
        
        <ScrollArea className={buildNumbers.length > 1 ? "h-[calc(100%-8rem)]" : "h-[calc(100%-4rem)]"}>
          <div className="p-4 space-y-2">
            {SECTIONS.map((section) => {
              const status = getSectionStatus(section.id)
              const Icon = section.icon
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                    activeSection === section.id 
                      ? "bg-white shadow-sm border" 
                      : "hover:bg-slate-100",
                    status === 'incomplete' && section.required && "border-red-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-600" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{section.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'complete' && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>

        {/* Navigation - Only show if multiple sinks */}
        {buildNumbers.length > 1 && (
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentBuildIndex(Math.max(0, currentBuildIndex - 1))}
                disabled={currentBuildIndex === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => setCurrentBuildIndex(Math.min(buildNumbers.length - 1, currentBuildIndex + 1))}
                disabled={currentBuildIndex === buildNumbers.length - 1}
                className="flex-1"
              >
                Next Sink
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area - Shows only active section */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Sink Body Section */}
            {activeSection === 'sink-body' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Sink Body Configuration</CardTitle>
                  <CardDescription>Configure the sink model, dimensions, legs, feet, and pegboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Sink Model */}
                    <div className="space-y-2">
                      <Label>Sink Model</Label>
                      <Select 
                        value={currentConfig.sinkModelId} 
                        onValueChange={(value) => {
                          const selectedModel = sinkModels.find(model => model.id === value)
                          if (selectedModel) {
                            // Auto-generate basins based on model
                            const basins = Array.from({ length: selectedModel.basinCount }, (_, i) => ({
                              id: `basin-${Date.now()}-${i}`,
                              basinType: '',
                              basinSizePartNumber: '',
                              addonIds: []
                            }))
                            updateConfig({ 
                              sinkModelId: value,
                              basins: basins
                            })
                          } else {
                            updateConfig({ sinkModelId: value })
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {sinkModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Workflow Direction */}
                    <div className="space-y-2">
                      <Label>Workflow Direction</Label>
                      <Select 
                        value={currentConfig.workflowDirection || 'LEFT_TO_RIGHT'} 
                        onValueChange={(value) => updateConfig({ workflowDirection: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEFT_TO_RIGHT">Left to Right</SelectItem>
                          <SelectItem value="RIGHT_TO_LEFT">Right to Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dimensions */}
                    <div className="space-y-2">
                      <Label>Width (inches)</Label>
                      <Input
                        type="number"
                        value={currentConfig.width || ''}
                        onChange={(e) => updateConfig({ width: parseInt(e.target.value) || null })}
                        placeholder="e.g., 48"
                        min="24"
                        max="120"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Length (inches)</Label>
                      <Input
                        type="number"
                        value={currentConfig.length || ''}
                        onChange={(e) => {
                          const inputValue = e.target.value
                          const numericValue = inputValue === '' ? null : parseInt(inputValue)
                          
                          // Allow typing (don't block during input), only warn on complete invalid values
                          updateConfig({ length: numericValue })
                          
                          // Show warning for completed invalid values
                          if (numericValue !== null && numericValue < 48) {
                            console.warn('Length must be at least 48 inches')
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value)
                          // Enforce minimum value when user finishes typing
                          if (!isNaN(value) && value < 48) {
                            updateConfig({ length: 48 })
                            console.warn('Length automatically corrected to minimum value: 48')
                          }
                        }}
                        placeholder="e.g., 60"
                        min="48"
                        max="120"
                        className={currentConfig.length && currentConfig.length < 48 ? "border-red-500" : ""}
                      />
                      {currentConfig.length && currentConfig.length < 48 && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Minimum length is 48 inches
                        </p>
                      )}
                    </div>

                    {/* Legs */}
                    <div className="space-y-2">
                      <Label>Leg Type</Label>
                      <Select 
                        value={currentConfig.legsTypeId} 
                        onValueChange={(value) => updateConfig({ legsTypeId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select legs" />
                        </SelectTrigger>
                        <SelectContent>
                          {legsOptions.heightAdjustable && (
                            <>
                              <div className="px-2 py-1 text-sm font-semibold text-gray-600">Height Adjustable</div>
                              {legsOptions.heightAdjustable.map((leg) => (
                                <SelectItem key={leg.id} value={leg.id}>
                                  {leg.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {legsOptions.fixedHeight && (
                            <>
                              <div className="px-2 py-1 text-sm font-semibold text-gray-600 mt-2">Fixed Height</div>
                              {legsOptions.fixedHeight.map((leg) => (
                                <SelectItem key={leg.id} value={leg.id}>
                                  {leg.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {/* Fallback for old format */}
                          {Array.isArray(legsOptions) && legsOptions.map((leg) => (
                            <SelectItem key={leg.id || leg.assemblyId} value={leg.id || leg.assemblyId}>
                              {leg.displayName || leg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Feet */}
                    <div className="space-y-2">
                      <Label>Feet Type</Label>
                      <Select 
                        value={currentConfig.feetTypeId} 
                        onValueChange={(value) => updateConfig({ feetTypeId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select feet" />
                        </SelectTrigger>
                        <SelectContent>
                          {feetOptions.map((feet) => (
                            <SelectItem key={feet.id || feet.assemblyId} value={feet.id || feet.assemblyId}>
                              {feet.displayName || feet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>


                  {/* Pegboard Configuration */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-medium">Pegboard Configuration</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pegboard-checkbox"
                          checked={currentConfig.pegboard || false}
                          onCheckedChange={(checked) => updateConfig({ pegboard: checked })}
                        />
                        <Label htmlFor="pegboard-checkbox" className="text-base font-medium cursor-pointer">Add Pegboard</Label>
                      </div>

                      {currentConfig.pegboard && (
                        <div className="space-y-4 mt-4">
                          {/* Pegboard Type */}
                          <div className="space-y-2">
                            <Label>Pegboard Type</Label>
                            <Select 
                              value={currentConfig.pegboardTypeId}
                              onValueChange={(value) => updateConfig({ pegboardTypeId: value })}
                              disabled={pegboardLoading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select pegboard type" />
                              </SelectTrigger>
                              <SelectContent>
                                {pegboardOptions.types?.map((type: any) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Colorsafe+ Options */}
                          <div className="space-y-2">
                            <Label>Colorsafe+ Color</Label>
                            <Select 
                              value={currentConfig.pegboardColorId || 'none'}
                              onValueChange={(value) => updateConfig({ pegboardColorId: value === 'none' ? '' : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select color (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Color</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-GREEN">Green</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-BLACK">Black</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-YELLOW">Yellow</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-GREY">Grey</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-RED">Red</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-BLUE">Blue</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-ORANGE">Orange</SelectItem>
                                <SelectItem value="T-OA-PB-COLOR-WHITE">White</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drawers & Compartments Configuration */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-medium">Drawers & Compartments</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="add-drawers-compartments"
                          checked={currentConfig.hasDrawersAndCompartments || (currentConfig.drawersAndCompartments?.length || 0) > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateConfig({ hasDrawersAndCompartments: true })
                            } else {
                              updateConfig({ hasDrawersAndCompartments: false, drawersAndCompartments: [] })
                            }
                          }}
                        />
                        <Label htmlFor="add-drawers-compartments" className="text-base font-medium cursor-pointer">
                          Add Drawers & Compartments
                        </Label>
                        <p className="text-sm text-muted-foreground">(Optional)</p>
                      </div>

                      {(currentConfig.hasDrawersAndCompartments || (currentConfig.drawersAndCompartments?.length || 0) > 0) && (
                        <div className="space-y-3 ml-6">
                          <Label>Available Options</Label>
                          <Select 
                            value=""
                            onValueChange={(value) => {
                              const current = currentConfig.drawersAndCompartments || []
                              if (!current.includes(value) && value !== "") {
                                updateConfig({ 
                                  drawersAndCompartments: [...current, value]
                                })
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select drawer or compartment to add" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Only show items that haven't been selected yet */}
                              {!(currentConfig.drawersAndCompartments || []).includes("T2-OA-2D-152012-STACKED-KIT") && (
                                <SelectItem value="T2-OA-2D-152012-STACKED-KIT">
                                  15 X 20 X 12 TALL STACKED TWO-DRAWER HOUSING WITH INTERIOR LINER KIT
                                </SelectItem>
                              )}
                              {!(currentConfig.drawersAndCompartments || []).includes("T2-OA-PO-SHLF-1212") && (
                                <SelectItem value="T2-OA-PO-SHLF-1212">
                                  12"X12" PULL OUT SHELF (ONLY COMPATIBLE WITH HA SHELF)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>

                          {/* Selected Items List */}
                          {(currentConfig.drawersAndCompartments || []).length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm text-slate-600">Selected Items</Label>
                              <div className="space-y-2">
                                {(currentConfig.drawersAndCompartments || []).map((item: string, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">
                                      {item === "T2-OA-2D-152012-STACKED-KIT" 
                                        ? "15 X 20 X 12 TALL STACKED TWO-DRAWER HOUSING WITH INTERIOR LINER KIT"
                                        : item === "T2-OA-PO-SHLF-1212"
                                        ? "12\"X12\" PULL OUT SHELF (ONLY COMPATIBLE WITH HA SHELF)"
                                        : item
                                      }
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                      onClick={() => {
                                        const current = currentConfig.drawersAndCompartments || []
                                        const updated = current.filter((_: string, i: number) => i !== index)
                                        updateConfig({ drawersAndCompartments: updated })
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Navigation */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={goToPrevSection}
                      disabled={!getPrevSection(activeSection)}
                      className="flex items-center gap-2"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Previous Section
                    </Button>
                    <Button
                      onClick={goToNextSection}
                      disabled={!canProceedToNext(activeSection) || !getNextSection(activeSection)}
                      className="flex items-center gap-2"
                    >
                      Next Section
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Basins Section */}
            {activeSection === 'basins' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Basin Configuration</CardTitle>
                  <CardDescription>
                    Configure exactly {getMaxBasins()} basin{getMaxBasins() > 1 ? 's' : ''} for this {getSelectedModel()?.name || 'sink'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">

                    {(!currentConfig.sinkModelId) ? (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Please select a sink model first to configure basins.
                        </AlertDescription>
                      </Alert>
                    ) : (!currentConfig.basins || currentConfig.basins.length === 0) ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No basins configured. Please re-select the sink model to initialize basins.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    
                    {currentConfig.basins && currentConfig.basins.length > 0 && (
                      currentConfig.basins.map((basin: any, index: number) => (
                        <Card key={basin.id} className="border-slate-200">
                          <CardContent className="pt-4">
                            <div className="mb-3">
                              <h4 className="font-medium">Basin {index + 1}</h4>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select 
                                  value={basin.basinType} 
                                  onValueChange={(value) => {
                                    const updatedBasins = [...currentConfig.basins]
                                    updatedBasins[index] = { ...basin, basinType: value }
                                    updateConfig({ basins: updatedBasins })
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {basinTypes.map((type) => (
                                      <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Size</Label>
                                <Select 
                                  value={basin.basinSizePartNumber || ''} 
                                  onValueChange={(value) => {
                                    const updatedBasins = [...currentConfig.basins]
                                    if (value === 'CUSTOM') {
                                      updatedBasins[index] = { 
                                        ...basin, 
                                        basinSizePartNumber: value,
                                        customWidth: null,
                                        customLength: null,
                                        customDepth: null
                                      }
                                    } else {
                                      updatedBasins[index] = { 
                                        ...basin, 
                                        basinSizePartNumber: value,
                                        customWidth: undefined,
                                        customLength: undefined,
                                        customDepth: undefined
                                      }
                                    }
                                    updateConfig({ basins: updatedBasins })
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select size" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {basinSizeOptions?.standardSizes?.filter((size: any) => !size.isCustom)?.map((size: any) => (
                                      <SelectItem key={size.assemblyId} value={size.assemblyId}>
                                        {size.dimensions}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="CUSTOM">Custom</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {/* Custom Dimensions */}
                                {basin.basinSizePartNumber === 'CUSTOM' && (
                                  <div className="grid grid-cols-3 gap-2 mt-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Width (in)</Label>
                                      <Input
                                        type="number"
                                        value={basin.customWidth || ''}
                                        onChange={(e) => {
                                          const updatedBasins = [...currentConfig.basins]
                                          updatedBasins[index] = { 
                                            ...basin, 
                                            customWidth: parseInt(e.target.value) || null 
                                          }
                                          updateConfig({ basins: updatedBasins })
                                        }}
                                        placeholder="W"
                                        min="1"
                                        max="50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Length (in)</Label>
                                      <Input
                                        type="number"
                                        value={basin.customLength || ''}
                                        onChange={(e) => {
                                          const updatedBasins = [...currentConfig.basins]
                                          updatedBasins[index] = { 
                                            ...basin, 
                                            customLength: parseInt(e.target.value) || null 
                                          }
                                          updateConfig({ basins: updatedBasins })
                                        }}
                                        placeholder="L"
                                        min="1"
                                        max="50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Depth (in)</Label>
                                      <Input
                                        type="number"
                                        value={basin.customDepth || ''}
                                        onChange={(e) => {
                                          const updatedBasins = [...currentConfig.basins]
                                          updatedBasins[index] = { 
                                            ...basin, 
                                            customDepth: parseInt(e.target.value) || null 
                                          }
                                          updateConfig({ basins: updatedBasins })
                                        }}
                                        placeholder="D"
                                        min="1"
                                        max="20"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Basin Add-ons */}
                            <div className="mt-4 space-y-2">
                              <Label>Add-ons</Label>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`p-trap-${basin.id}`}
                                    checked={basin.addonIds?.includes('T2-OA-MS-1026') || false}
                                    onCheckedChange={(checked) => {
                                      const updatedBasins = [...currentConfig.basins]
                                      const currentAddons = basin.addonIds || []
                                      if (checked) {
                                        updatedBasins[index] = {
                                          ...basin,
                                          addonIds: [...currentAddons, 'T2-OA-MS-1026']
                                        }
                                      } else {
                                        updatedBasins[index] = {
                                          ...basin,
                                          addonIds: currentAddons.filter((id: string) => id !== 'T2-OA-MS-1026')
                                        }
                                      }
                                      updateConfig({ basins: updatedBasins })
                                    }}
                                  />
                                  <label
                                    htmlFor={`p-trap-${basin.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    P-Trap Disinfection Drain Unit
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`basin-light-${basin.id}`}
                                    checked={basin.addonIds?.includes('T2-OA-BASIN-LIGHT-ESK-KIT') || basin.addonIds?.includes('T2-OA-BASIN-LIGHT-EDR-KIT') || false}
                                    disabled={!basin.basinType}
                                    onCheckedChange={(checked) => {
                                      const updatedBasins = [...currentConfig.basins]
                                      const currentAddons = basin.addonIds || []
                                      const lightKitId = basin.basinType === 'E_DRAIN' ? 'T2-OA-BASIN-LIGHT-EDR-KIT' : 'T2-OA-BASIN-LIGHT-ESK-KIT'
                                      
                                      if (checked) {
                                        // Remove any existing light kit and add the appropriate one
                                        const filteredAddons = currentAddons.filter((id: string) => 
                                          !id.includes('BASIN-LIGHT')
                                        )
                                        updatedBasins[index] = {
                                          ...basin,
                                          addonIds: [...filteredAddons, lightKitId]
                                        }
                                      } else {
                                        updatedBasins[index] = {
                                          ...basin,
                                          addonIds: currentAddons.filter((id: string) => !id.includes('BASIN-LIGHT'))
                                        }
                                      }
                                      updateConfig({ basins: updatedBasins })
                                    }}
                                  />
                                  <label
                                    htmlFor={`basin-light-${basin.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    Basin Light Kit {!basin.basinType && '(Select basin type first)'}
                                  </label>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}

                    {/* Section Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={goToPrevSection}
                        disabled={!getPrevSection(activeSection)}
                        className="flex items-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Previous Section
                      </Button>
                      <Button
                        onClick={goToNextSection}
                        disabled={!canProceedToNext(activeSection) || (!getNextSection(activeSection) && !isAllConfigurationComplete())}
                        className="flex items-center gap-2"
                      >
                        {getNextSection(activeSection) 
                          ? 'Next Section' 
                          : isAllConfigurationComplete() 
                          ? 'Go to Accessories' 
                          : 'Complete All Sinks First'}
                        {(getNextSection(activeSection) || isAllConfigurationComplete()) && <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Faucets Section */}
            {activeSection === 'faucets' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Faucet Configuration</CardTitle>
                  <CardDescription>
                    Configure faucets for your sink (Maximum: {getMaxFaucets()} faucets)
                    <br />
                    <span className="text-sm text-slate-600">
                      E-Drain basins: Faucets can only be placed between basins • E-Sink basins: No restrictions
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Faucets</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const currentFaucets = currentConfig.faucets || []
                          if (currentFaucets.length < getMaxFaucets()) {
                            const defaultPlacement = getDefaultFaucetPlacement()
                            updateConfig({ 
                              faucets: [...currentFaucets, {
                                id: `faucet-${Date.now()}`,
                                faucetTypeId: '',
                                placement: defaultPlacement
                              }]
                            })
                          }
                        }}
                        disabled={!getSelectedModel() || (currentConfig.faucets?.length || 0) >= getMaxFaucets()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Faucet
                      </Button>
                    </div>

                    {(!currentConfig.faucets || currentConfig.faucets.length === 0) ? (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          No faucets configured. Click "Add Faucet" to add a faucet configuration.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      currentConfig.faucets.map((faucet: any, index: number) => (
                        <Card key={faucet.id} className="border-slate-200">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium">Faucet {index + 1}</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => {
                                  const updatedFaucets = currentConfig.faucets.filter((_: any, i: number) => i !== index)
                                  updateConfig({ faucets: updatedFaucets })
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select 
                                  value={faucet.faucetTypeId} 
                                  onValueChange={(value) => {
                                    const updatedFaucets = [...currentConfig.faucets]
                                    updatedFaucets[index] = { ...faucet, faucetTypeId: value }
                                    updateConfig({ faucets: updatedFaucets })
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {faucetTypes.map((type) => (
                                      <SelectItem key={type.assemblyId} value={type.assemblyId}>
                                        {type.displayName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Placement</Label>
                                <Select 
                                  value={faucet.placement} 
                                  onValueChange={(value) => {
                                    const updatedFaucets = [...currentConfig.faucets]
                                    updatedFaucets[index] = { ...faucet, placement: value }
                                    updateConfig({ faucets: updatedFaucets })
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select placement" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(() => {
                                      const options = getPlacementOptions(index)
                                      const categories = Array.from(new Set(options.map(o => o.category))).filter(Boolean)
                                      
                                      if (categories.length <= 1) {
                                        // Simple list if only one or no categories
                                        return options.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))
                                      }
                                      
                                      // Grouped by category
                                      return categories.map((category) => (
                                        <div key={category}>
                                          <div className="px-2 py-1 text-sm font-semibold text-gray-600">{category}</div>
                                          {options.filter(o => o.category === category).map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </div>
                                      ))
                                    })()}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}

                    {/* Section Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={goToPrevSection}
                        disabled={!getPrevSection(activeSection)}
                        className="flex items-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Previous Section
                      </Button>
                      <Button
                        onClick={goToNextSection}
                        disabled={!canProceedToNext(activeSection) || (!getNextSection(activeSection) && !isAllConfigurationComplete())}
                        className="flex items-center gap-2"
                      >
                        {getNextSection(activeSection) 
                          ? 'Next Section' 
                          : isAllConfigurationComplete() 
                          ? 'Go to Accessories' 
                          : 'Complete All Sinks First'}
                        {(getNextSection(activeSection) || isAllConfigurationComplete()) && <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sprayers Section */}
            {activeSection === 'sprayers' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Sprayer Configuration</CardTitle>
                  <CardDescription>
                    Configure sprayers for your sink (Maximum: 2 sprayers)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Sprayers</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const currentSprayers = currentConfig.sprayers || []
                          if (currentSprayers.length < 2) {
                            updateConfig({ 
                              sprayers: [...currentSprayers, {
                                id: `sprayer-${Date.now()}`,
                                sprayerTypeId: '',
                                location: ''
                              }]
                            })
                          }
                        }}
                        disabled={currentConfig.sprayers && currentConfig.sprayers.length >= 2}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Sprayer
                      </Button>
                    </div>

                    {(!currentConfig.sprayers || currentConfig.sprayers.length === 0) ? (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          No sprayers configured. Sprayers are optional.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      currentConfig.sprayers.map((sprayer: any, index: number) => (
                        <Card key={sprayer.id} className="border-slate-200">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium">Sprayer {index + 1}</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => {
                                  const updatedSprayers = currentConfig.sprayers.filter((_: any, i: number) => i !== index)
                                  updateConfig({ sprayers: updatedSprayers })
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select 
                                  value={sprayer.sprayerTypeId} 
                                  onValueChange={(value) => {
                                    const updatedSprayers = [...currentConfig.sprayers]
                                    updatedSprayers[index] = { ...sprayer, sprayerTypeId: value }
                                    updateConfig({ sprayers: updatedSprayers })
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sprayerTypes.map((type) => (
                                      <SelectItem key={type.assemblyId} value={type.assemblyId}>
                                        {type.displayName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Location</Label>
                                <Select 
                                  value={sprayer.location} 
                                  onValueChange={(value) => {
                                    const updatedSprayers = [...currentConfig.sprayers]
                                    updatedSprayers[index] = { ...sprayer, location: value }
                                    updateConfig({ sprayers: updatedSprayers })
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="LEFT_SIDE">Left Side</SelectItem>
                                    <SelectItem value="RIGHT_SIDE">Right Side</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}

                    {/* Section Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={goToPrevSection}
                        disabled={!getPrevSection(activeSection)}
                        className="flex items-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Previous Section
                      </Button>
                      <Button
                        onClick={goToNextSection}
                        disabled={!canProceedToNext(activeSection) || (!getNextSection(activeSection) && !isAllConfigurationComplete())}
                        className="flex items-center gap-2"
                      >
                        {getNextSection(activeSection) 
                          ? 'Next Section' 
                          : isAllConfigurationComplete() 
                          ? 'Go to Accessories' 
                          : 'Complete All Sinks First'}
                        {(getNextSection(activeSection) || isAllConfigurationComplete()) && <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  )
}