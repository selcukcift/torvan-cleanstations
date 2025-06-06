"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Package,
  AlertCircle,
  CheckCircle,
  Download,
  Search,
  TreePine,
  List
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface BOMDebugHelperProps {
  orderConfig: any
  customerInfo?: any
  isVisible: boolean
  onToggleVisibility: () => void
}

interface BOMItem {
  assemblyId: string
  name: string
  description?: string
  quantity: number
  category?: string
  subItems?: BOMItem[]
  partNumber?: string
  id?: string
  level?: number
  indentLevel?: number
  isChild?: boolean
  isPart?: boolean
  hasChildren?: boolean
  children?: BOMItem[]
}

interface BOMData {
  items: BOMItem[]
  totalItems: number
  isComplete: boolean
  missingRequiredFields: string[]
  hierarchical?: BOMItem[]
  topLevelItems?: number
}

export function BOMDebugHelper({ orderConfig, customerInfo, isVisible, onToggleVisibility }: BOMDebugHelperProps) {
  // Debug the incoming configuration
  useEffect(() => {
    if (orderConfig) {
      console.log('🔧 BOMDebugHelper received orderConfig:', {
        legsTypeId: orderConfig.legsTypeId,
        feetTypeId: orderConfig.feetTypeId,
        drawersAndCompartments: orderConfig.drawersAndCompartments,
        pegboard: orderConfig.pegboard,
        pegboardType: orderConfig.pegboardType,
        pegboardColor: orderConfig.pegboardColor,
        pegboardTypeId: orderConfig.pegboardTypeId,
        hasPegboard: orderConfig.hasPegboard,
        length: orderConfig.length,
        width: orderConfig.width
      })
    }
  }, [orderConfig])
  const [bomData, setBomData] = useState<BOMData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sink-body', 'basin', 'accessories', 'accessory-storage', 'accessory-lighting']))
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'categorized' | 'hierarchical'>('hierarchical')
  const [maxDepth, setMaxDepth] = useState(3)
  const [accessoryAnalysis, setAccessoryAnalysis] = useState<any>(null)

  // Pegboard kit mapping function - maps sink length, type, and color to specific kit part number
  const getPegboardKitId = (sinkLength: number, pegboardType: string, color: string) => {
    // Standard pegboard sizes with coverage ranges  
    const pegboardSizes = [
      { size: '3436', covers: [34, 47] },
      { size: '4836', covers: [48, 59] },
      { size: '6036', covers: [60, 71] },
      { size: '7236', covers: [72, 83] },
      { size: '8436', covers: [84, 95] },
      { size: '9636', covers: [95, 107] },
      { size: '10836', covers: [108, 119] },
      { size: '12036', covers: [120, 130] }
    ]

    // Find appropriate size based on sink length
    const selectedSize = pegboardSizes.find(pb => 
      sinkLength >= pb.covers[0] && sinkLength <= pb.covers[1]
    ) || pegboardSizes[pegboardSizes.length - 1] // Default to largest if over range

    // Map pegboard type to suffix
    const typeCode = pegboardType === 'PERFORATED' ? 'PERF' : 'SOLID'
    const colorCode = color.toUpperCase()
    
    return `T2-ADW-PB-${selectedSize.size}-${colorCode}-${typeCode}-KIT`
  }

  const generateBOMPreview = useCallback(async () => {
    if (!orderConfig || !orderConfig.sinkModelId) {
      setBomData(null)
      return
    }

    // Check for required fields based on sink model
    const missingFields = []
    if (!orderConfig.width && !orderConfig.length) {
      missingFields.push('Sink dimensions (width/length)')
    }
    
    // If required fields are missing, show them but don't prevent BOM generation
    if (missingFields.length > 0) {
      setBomData({
        items: [],
        totalItems: 0,
        isComplete: false,
        missingRequiredFields: missingFields,
        hierarchical: [],
        topLevelItems: 0
      })
      // Don't return - let it try to generate partial BOM
    }

    setLoading(true)
    setError(null)
    
    try {
      // Create minimal required data structure for BOM preview
      const configData: any = {
        sinkModelId: orderConfig.sinkModelId
      }

      // Add optional fields only if they exist
      if (orderConfig.width) configData.width = orderConfig.width
      if (orderConfig.length) configData.length = orderConfig.length
      if (orderConfig.legsTypeId) configData.legsTypeId = orderConfig.legsTypeId
      if (orderConfig.feetTypeId) configData.feetTypeId = orderConfig.feetTypeId
      if (orderConfig.pegboard) {
        configData.pegboard = orderConfig.pegboard
        if (orderConfig.pegboardTypeId) configData.pegboardTypeId = orderConfig.pegboardTypeId
        
        // Extract pegboard type and color from IDs
        const pegboardType = orderConfig.pegboardTypeId || orderConfig.pegboardType
        let pegboardColor = orderConfig.pegboardColor
        
        // Extract color from pegboardColorId if needed (format: T-OA-PB-COLOR-BLUE -> BLUE)
        if (!pegboardColor && orderConfig.pegboardColorId) {
          const colorMatch = orderConfig.pegboardColorId.match(/T-OA-PB-COLOR-(.+)/)
          if (colorMatch) {
            pegboardColor = colorMatch[1] // Extract color name (e.g., "BLUE")
          }
        }
        
        // Map to specific pegboard kit based on size, type, and color
        if (orderConfig.length && pegboardType && pegboardColor) {
          const specificKitId = getPegboardKitId(orderConfig.length, pegboardType, pegboardColor)
          configData.specificPegboardKitId = specificKitId
          
          console.log('🔧 Pegboard kit mapping:', {
            sinkLength: orderConfig.length,
            pegboardType: pegboardType,
            pegboardColor: pegboardColor,
            pegboardColorId: orderConfig.pegboardColorId,
            mappedKitId: specificKitId
          })
        }
        // Pegboard size is now auto-calculated based on sink length
      }
      if (orderConfig.workflowDirection) configData.workflowDirection = orderConfig.workflowDirection

      // Add drawers & compartments if configured
      if (orderConfig.drawersAndCompartments && orderConfig.drawersAndCompartments.length > 0) {
        configData.drawersAndCompartments = orderConfig.drawersAndCompartments
      }

      // Add basins if configured
      if (orderConfig.basins && orderConfig.basins.length > 0) {
        configData.basins = orderConfig.basins.map((basin: any) => {
          const basinData: any = {}
          
          // Map basin type IDs to kit assembly IDs
          if (basin.basinType || basin.basinTypeId) {
            const basinTypeValue = basin.basinType || basin.basinTypeId
            let kitAssemblyId = basinTypeValue
            
            // Map the UI values to actual kit assembly IDs
            switch (basinTypeValue) {
              case 'E_SINK':
                kitAssemblyId = 'T2-BSN-ESK-KIT'
                break
              case 'E_SINK_DI':
                kitAssemblyId = 'T2-BSN-ESK-DI-KIT'
                break
              case 'E_DRAIN':
                kitAssemblyId = 'T2-BSN-EDR-KIT'
                break
              default:
                // If it's already a kit assembly ID, keep it
                if (!basinTypeValue.startsWith('T2-BSN-')) {
                  console.warn(`Unknown basin type: ${basinTypeValue}`)
                }
                kitAssemblyId = basinTypeValue
            }
            basinData.basinTypeId = kitAssemblyId
          }
          
          // Handle custom basin dimensions first
          if (basin.basinSizePartNumber === 'CUSTOM' && basin.customWidth && basin.customLength && basin.customDepth) {
            const customDimensions = `${basin.customWidth}X${basin.customLength}X${basin.customDepth}`
            basinData.basinSizePartNumber = `720.215.001`
            basinData.customPartNumber = `T2-ADW-BASIN-${customDimensions}`
            basinData.customDimensions = customDimensions
          }
          // Map basin size to part number
          else if (basin.basinSizePartNumber || basin.basinSize) {
            let sizePartNumber = basin.basinSizePartNumber
            
            // Map configurator service assemblyId to actual assembly names
            const assemblyIdMappings: Record<string, string> = {
              '712.102': 'T2-ADW-BASIN20X20X8',
              '712.103': 'T2-ADW-BASIN24X20X8',
              '712.104': 'T2-ADW-BASIN24X20X10',
              '712.105': 'T2-ADW-BASIN30X20X8',
              '712.106': 'T2-ADW-BASIN30X20X10'
            }
            
            // Map assembly ID to actual assembly name if needed
            if (sizePartNumber && assemblyIdMappings[sizePartNumber]) {
              sizePartNumber = assemblyIdMappings[sizePartNumber]
            }
            
            // Map UI basin size values to actual part numbers
            if (basin.basinSize && !sizePartNumber) {
              const sizeMappings: Record<string, string> = {
                '20X20X8': 'T2-ADW-BASIN20X20X8',
                '24X20X8': 'T2-ADW-BASIN24X20X8', 
                '24X20X10': 'T2-ADW-BASIN24X20X10',
                '30X20X8': 'T2-ADW-BASIN30X20X8',
                '30X20X10': 'T2-ADW-BASIN30X20X10'
              }
              
              // Handle standard sizes
              if (sizeMappings[basin.basinSize]) {
                sizePartNumber = sizeMappings[basin.basinSize]
              }
              // Handle custom sizes - either "CUSTOM" or dimension format
              else if (basin.basinSize === 'CUSTOM' || basin.basinSizePartNumber === 'CUSTOM') {
                // If custom basin is selected, use the individual dimension fields
                if (basin.customWidth && basin.customLength && basin.customDepth) {
                  const customDimensions = `${basin.customWidth}X${basin.customLength}X${basin.customDepth}`
                  sizePartNumber = `720.215.001`
                  basinData.customPartNumber = `T2-ADW-BASIN-${customDimensions}`
                  basinData.customDimensions = customDimensions
                } else if (basin.basinSize && basin.basinSize !== 'CUSTOM') {
                  // Direct dimension format like "32X22X10" or "32x22x10"
                  const normalizedDimensions = basin.basinSize.toUpperCase()
                  sizePartNumber = `720.215.001`
                  basinData.customPartNumber = `T2-ADW-BASIN-${normalizedDimensions}`
                  basinData.customDimensions = normalizedDimensions
                }
              }
              // Handle legacy custom dimension format
              else if (basin.basinSize && (basin.basinSize.includes('X') || basin.basinSize.includes('x'))) {
                const normalizedDimensions = basin.basinSize.toUpperCase()
                sizePartNumber = `720.215.001`
                basinData.customPartNumber = `T2-ADW-BASIN-${normalizedDimensions}`
                basinData.customDimensions = normalizedDimensions
              }
              // Fallback - use as-is
              else {
                sizePartNumber = basin.basinSize
              }
            }
            
            if (sizePartNumber) {
              basinData.basinSizePartNumber = sizePartNumber
            }
          }
          
          if (basin.addonIds && basin.addonIds.length > 0) basinData.addonIds = basin.addonIds
          return basinData
        }).filter((basin: any) => basin.basinTypeId || basin.basinSizePartNumber || (basin.addonIds && basin.addonIds.length > 0))
      }

      // Add faucets if configured
      if (orderConfig.faucets && orderConfig.faucets.length > 0) {
        configData.faucets = orderConfig.faucets.map((faucet: any) => ({
          faucetTypeId: faucet.faucetTypeId, // Fixed: was faucet.faucetType
          quantity: 1
        })).filter((faucet: any) => faucet.faucetTypeId)
      }

      // Add sprayers if configured
      if (orderConfig.sprayers && orderConfig.sprayers.length > 0) {
        configData.sprayers = orderConfig.sprayers.map((sprayer: any) => ({
          id: sprayer.id,
          sprayerTypeId: sprayer.sprayerTypeId, // Fixed: was sprayer.sprayerType
          location: sprayer.location
        })).filter((sprayer: any) => sprayer.sprayerTypeId)
      }

      if (orderConfig.controlBoxId) configData.controlBoxId = orderConfig.controlBoxId

      // Add accessories if configured in order
      const debugAccessories: Record<string, any[]> = {}
      if (orderConfig.accessories && Array.isArray(orderConfig.accessories)) {
        debugAccessories["DEBUG-001"] = orderConfig.accessories.map((acc: any) => ({
          assemblyId: acc.assemblyId || acc.accessoryId,
          quantity: acc.quantity || 1,
          name: acc.name
        }))
      }

      console.log('BOMDebugHelper: configData being sent to BOM generation:', configData)

      const previewData = {
        customerInfo: {
          poNumber: "DEBUG-PREVIEW",
          customerName: "Debug Customer",
          salesPerson: "Debug User",
          wantDate: new Date().toISOString(),
          language: customerInfo?.language || "EN"
        },
        sinkSelection: {
          sinkModelId: orderConfig.sinkModelId,
          quantity: 1,
          buildNumbers: ["DEBUG-001"]
        },
        configurations: {
          "DEBUG-001": configData
        },
        accessories: debugAccessories
      }

      console.log('Sending BOM preview data:', JSON.stringify(previewData, null, 2))
      
      const axiosResponse = await nextJsApiClient.post('/orders/preview-bom', previewData)
      const response = axiosResponse.data // Extract the actual response data from axios

      console.log('Axios Response:', axiosResponse)
      console.log('BOM API Response:', response)
      console.log('Response type:', typeof response)
      console.log('Response keys:', Object.keys(response || {}))
      
      // Debug drawer items in BOM response
      if (response && response.hierarchical) {
        const drawerItems = response.hierarchical.filter((item: any) => 
          item.name?.toLowerCase().includes('drawer') || 
          item.name?.toLowerCase().includes('stacked') ||
          item.name?.toLowerCase().includes('pull') ||
          item.assemblyId?.toLowerCase().includes('t2-oa-2d') ||
          item.assemblyId?.toLowerCase().includes('t2-oa-po')
        )
        if (drawerItems.length > 0) {
          console.log('🗂️ Found drawer items in BOM:', drawerItems)
        }
      }

      if (!response) {
        setError('No response received from BOM API')
        return
      }

      if (response.success) {
        console.log('BOM data received:', response.data)
        
        // Handle new hierarchical BOM structure - bomResult is an object with hierarchical and flattened arrays
        const bomResult = response.data.bom || response.data
        const items = bomResult.flattened || []
        const hierarchicalItems = bomResult.hierarchical || []
        
        // Check for missing required fields based on what was generated
        const currentMissingFields = []
        if (!orderConfig.width && !orderConfig.length) {
          currentMissingFields.push('Sink dimensions (width/length)')
        }
        
        // Check if we got a sink body in the BOM
        const hasSinkBody = items.some((item: BOMItem) => item.category === 'SINK_BODY')
        if (!hasSinkBody && currentMissingFields.includes('Sink dimensions (width/length)')) {
          console.warn('No sink body generated due to missing dimensions')
        }
        

        setBomData({
          items: items,
          totalItems: bomResult.totalItems || items.length,
          isComplete: currentMissingFields.length === 0,
          missingRequiredFields: currentMissingFields,
          hierarchical: hierarchicalItems,
          topLevelItems: bomResult.topLevelItems || 0
        })
      } else {
        console.error('BOM generation failed:', response)
        const errorMsg = response.error || response.message || response.errors || 'Failed to generate BOM preview'
        setError(Array.isArray(errorMsg) ? errorMsg.map(e => e.message || e).join(', ') : errorMsg)
      }
    } catch (err) {
      console.error('BOM preview error:', err)
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      })
      setError('Failed to generate BOM preview: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [orderConfig])

  // Auto-refresh BOM when configuration changes
  useEffect(() => {
    if (isVisible && orderConfig) {
      generateBOMPreview()
    }
  }, [orderConfig, isVisible, generateBOMPreview])

  // Analyze accessories in the BOM
  const analyzeAccessories = useCallback((bomItems: BOMItem[]) => {
    if (!bomItems || bomItems.length === 0) {
      setAccessoryAnalysis(null)
      return
    }

    const accessories = bomItems.filter(item => {
      const id = (item.assemblyId || item.partNumber || '').toLowerCase()
      const partPrefix = id.match(/^(\d{3}\.\d+)/)?.[1] || ''
      return partPrefix.startsWith('702.') || partPrefix.startsWith('703.') || 
             partPrefix.startsWith('704.') || partPrefix.startsWith('705.') ||
             partPrefix.startsWith('720.') || item.category === 'ACCESSORY'
    })

    const analysis = {
      totalAccessories: accessories.length,
      byCategory: {
        storage: accessories.filter(a => {
          const id = (a.assemblyId || a.partNumber || '').toLowerCase()
          const name = (a.name || '').toLowerCase()
          return id.match(/^702\./) || name.includes('shelf') || name.includes('rail') || name.includes('basket')
        }).length,
        lighting: accessories.filter(a => {
          const id = (a.assemblyId || a.partNumber || '').toLowerCase()
          const name = (a.name || '').toLowerCase()
          return id.match(/^703\./) || name.includes('light') || name.includes('magnify')
        }).length,
        organization: accessories.filter(a => {
          const id = (a.assemblyId || a.partNumber || '').toLowerCase()
          const name = (a.name || '').toLowerCase()
          return id.match(/^704\./) || name.includes('holder') || name.includes('organizer') || name.includes('brush')
        }).length,
        dispensers: accessories.filter(a => {
          const id = (a.assemblyId || a.partNumber || '').toLowerCase()
          const name = (a.name || '').toLowerCase()
          return id.match(/^705\./) || name.includes('dispenser') || name.includes('glove')
        }).length
      },
      accessories: accessories,
      // Check for common accessory combinations
      hasLighting: accessories.some(a => (a.name || '').toLowerCase().includes('light')),
      hasStorage: accessories.some(a => (a.name || '').toLowerCase().includes('shelf') || (a.name || '').toLowerCase().includes('basket')),
      hasOrganization: accessories.some(a => (a.name || '').toLowerCase().includes('organizer') || (a.name || '').toLowerCase().includes('holder')),
      hasDispensers: accessories.some(a => (a.name || '').toLowerCase().includes('dispenser'))
    }

    setAccessoryAnalysis(analysis)
  }, [])

  // Analyze accessories when BOM data changes
  useEffect(() => {
    if (bomData && bomData.items) {
      analyzeAccessories(bomData.items)
    }
  }, [bomData, analyzeAccessories])

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const categorizeItems = (items: any[]) => {
    const categories: Record<string, any[]> = {
      'system': [],
      'sink-body': [],
      'basin': [],
      'faucet-sprayer': [],
      'control-box': [],
      'accessories': [],
      'accessory-storage': [],
      'accessory-lighting': [],
      'accessory-organization': [],
      'accessory-dispensers': [],
      'accessory-other': [],
      'service-parts': [],
      'other': []
    }

    // First, aggregate items by ID to combine quantities
    const aggregatedItems = new Map<string, any>()
    
    items.forEach(item => {
      const itemId = item.id || item.assemblyId || item.partNumber || 'unknown'
      const key = `${itemId}-${item.name || 'unnamed'}`
      
      if (aggregatedItems.has(key)) {
        // Item already exists, add quantities
        const existingItem = aggregatedItems.get(key)!
        existingItem.quantity = (existingItem.quantity || 1) + (item.quantity || 1)
        
        
        // Keep track of source contexts for debugging
        if (!existingItem.sourceContexts) {
          existingItem.sourceContexts = [existingItem.category || 'unknown']
        }
        existingItem.sourceContexts.push(item.category || 'unknown')
        
        console.log(`🔧 BOM Debug: Aggregated ${itemId} - Total quantity: ${existingItem.quantity}`, {
          originalQuantity: existingItem.quantity - (item.quantity || 1),
          addedQuantity: item.quantity || 1,
          newTotal: existingItem.quantity,
          sourceContexts: existingItem.sourceContexts
        })
      } else {
        // New item, add it with source context
        const newItem = { 
          ...item, 
          sourceContexts: [item.category || 'unknown'],
          quantity: item.quantity || 1 
        }
        aggregatedItems.set(key, newItem)
      }
    })

    // Helper function to extract part number prefix
    const getPartNumberPrefix = (id: string): string => {
      const match = id.match(/^(\d{3}\.\d+)/);
      return match ? match[1] : '';
    }

    // Now categorize the aggregated items
    Array.from(aggregatedItems.values()).forEach(item => {
      const id = (item.assemblyId || item.partNumber || '').toLowerCase()
      const name = (item.name || item.description || '').toLowerCase()
      const category = item.category || ''
      const partPrefix = getPartNumberPrefix(id)
      
      // Use configuration-based categorization with part number ranges
      if (category === 'SYSTEM' || name.includes('manual')) {
        categories['system'].push(item)
      } else if (
        // Sink Body Configuration - includes legs, feet, pegboard, overhead lights
        category === 'SINK_BODY' || 
        // Sink body assemblies (709.82-709.84)
        partPrefix.startsWith('709.') ||
        // Legs assemblies (711.97-711.101)
        (partPrefix.startsWith('711.') && parseInt(partPrefix.split('.')[1]) >= 97 && parseInt(partPrefix.split('.')[1]) <= 101) ||
        // Feet assemblies (711.95-711.96)
        partPrefix === '711.95' || partPrefix === '711.96' ||
        // Pegboard components (715.120-715.127, 716.128-716.131, 708.77)
        (partPrefix.startsWith('715.') && parseInt(partPrefix.split('.')[1]) >= 120 && parseInt(partPrefix.split('.')[1]) <= 127) ||
        partPrefix === '716.128' || partPrefix === '716.130' || partPrefix === '716.131' ||
        partPrefix === '708.77' ||
        // Sink body part IDs
        id.includes('t2-body-') ||
        id.includes('t2-dl27') || id.includes('t2-dl14') || id.includes('t2-lc1') ||
        id.includes('leveling-castor') || id.includes('seismic-feet') ||
        id.includes('castor') || id.includes('feet') ||
        id.includes('t2-adw-pb-') || id.includes('t2-ohl-mdrd-kit') || 
        id.includes('t2-adw-pb-perf-kit') || id.includes('t2-adw-pb-solid-kit') ||
        id.includes('t-oa-pb-color') || id.includes('pb-color') ||
        id.includes('t-oa-ohl-led') ||
        id.includes('t2-pwrbar-kit') ||
        id.includes('t2-adw-') && (id.includes('frame') || id.includes('instro')) ||
        name.includes('sink body') || name.includes('frame') || name.includes('lifter') || 
        name.includes('leg') || name.includes('pegboard') || name.includes('overhead light') ||
        name.includes('power bar') ||
        // Drawer & Compartment items
        category === 'DRAWER_COMPARTMENT' ||
        id === 't2-oa-2d-152012-stacked-kit' || id === 't2-oa-po-shlf-1212' ||
        name.includes('drawer') || name.includes('pull-out shelf')
      ) {
        categories['sink-body'].push(item)
      } else if (
        // Basin Configuration (712.*, 713.*, 706.65, 706.67-706.68)
        category === 'BASIN' || category?.includes('BASIN') ||
        // Basin types (713.107-713.109)
        (partPrefix.startsWith('713.') && parseInt(partPrefix.split('.')[1]) >= 107 && parseInt(partPrefix.split('.')[1]) <= 109) ||
        // Basin sizes (712.102-712.106)
        (partPrefix.startsWith('712.') && parseInt(partPrefix.split('.')[1]) >= 102 && parseInt(partPrefix.split('.')[1]) <= 106) ||
        // Basin add-ons
        partPrefix === '706.65' || partPrefix === '706.67' || partPrefix === '706.68' ||
        // Basin part IDs
        id.includes('t2-bsn-edr-kit') || id.includes('t2-bsn-esk-kit') || id.includes('t2-bsn-esk-di-kit') ||
        id.includes('t2-adw-basin') ||
        id.includes('t2-drain-') || id.includes('t2-valve-') || id.includes('t2-bottom-fill') ||
        id.includes('t2-edr-temp') || id.includes('t2-esk-temp') || id.includes('t2-emergstop') ||
        id.includes('t2-oa-ms-1026') || // P-trap
        id.includes('t2-oa-basin-light') || // Basin lights
        name.includes('basin') || name.includes('drain') || name.includes('valve plate') ||
        name.includes('p-trap') || name.includes('basin light')
      ) {
        categories['basin'].push(item)
      } else if (
        // Faucet & Sprayer Configuration (706.58-706.64)
        // Faucet kits (706.58-706.60)
        partPrefix === '706.58' || partPrefix === '706.59' || partPrefix === '706.60' ||
        // Sprayer kits (706.61-706.64)
        partPrefix === '706.61' || partPrefix === '706.62' || partPrefix === '706.63' || partPrefix === '706.64' ||
        // Faucet/sprayer part IDs
        id.includes('t2-oa-std-faucet') || id.includes('t2-oa-pre-rinse') || id.includes('t2-oa-di-gooseneck') ||
        id.includes('t2-oa-watergun') || id.includes('t2-oa-airgun') ||
        name.includes('faucet kit') || name.includes('sprayer') || name.includes('gun kit')
      ) {
        categories['faucet-sprayer'].push(item)
      } else if (
        // Control Box (719.176-719.184)
        category === 'CONTROL_BOX' || 
        (partPrefix.startsWith('719.') && parseInt(partPrefix.split('.')[1]) >= 176 && parseInt(partPrefix.split('.')[1]) <= 184) ||
        id.includes('t2-ctrl-') ||
        name.includes('control box')
      ) {
        categories['control-box'].push(item)
      } else if (
        // Accessories (702.*, 703.*, 704.*, 705.*)
        category === 'ACCESSORY' ||
        partPrefix.startsWith('702.') || partPrefix.startsWith('703.') || 
        partPrefix.startsWith('704.') || partPrefix.startsWith('705.') ||
        ((id.includes('t-oa-') || id.includes('t2-oa-')) && 
        !id.includes('faucet') && !id.includes('gun') && !id.includes('pb-') && !id.includes('ohl-led') &&
        !id.includes('t2-adw-pb-') && !id.includes('t2-ohl-mdrd-kit') && 
        !id.includes('t2-adw-pb-perf-kit') && !id.includes('t2-adw-pb-solid-kit') &&
        !id.includes('basin-light') && !id.includes('ms-1026'))
      ) {
        // Detailed accessory categorization based on part numbers and names
        if (
          // Storage & Organization (702.*)
          partPrefix.startsWith('702.') || 
          name.includes('basket') || name.includes('shelf') || name.includes('rail') || 
          name.includes('bin') || name.includes('drawer') || name.includes('rack') ||
          id.includes('binrail') || id.includes('shelf') || id.includes('basket')
        ) {
          categories['accessory-storage'].push(item)
        } else if (
          // Lighting (703.*)
          partPrefix.startsWith('703.') ||
          name.includes('light') || name.includes('magnify') || name.includes('task') ||
          id.includes('light') || id.includes('mlight') || id.includes('tasklight')
        ) {
          categories['accessory-lighting'].push(item)
        } else if (
          // Organization & Holders (704.*)
          partPrefix.startsWith('704.') ||
          name.includes('holder') || name.includes('organizer') || name.includes('mount') ||
          name.includes('brush') || name.includes('instrument') ||
          id.includes('brush') || id.includes('org') || id.includes('holder') || id.includes('mount')
        ) {
          categories['accessory-organization'].push(item)
        } else if (
          // Dispensers (705.*)
          partPrefix.startsWith('705.') ||
          name.includes('dispenser') || name.includes('glove') || name.includes('soap') ||
          id.includes('glove') || id.includes('dispenser')
        ) {
          categories['accessory-dispensers'].push(item)
        } else {
          // Other accessories
          categories['accessory-other'].push(item)
        }
      } else if (
        // General accessories fallback
        name.includes('accessory') || 
        (name.includes('cover') || name.includes('arm') || name.includes('support'))
      ) {
        categories['accessories'].push(item)
      } else if (
        // Service Parts (other 719.* excluding control boxes)
        (category === 'SERVICE_PART' || category?.includes('SERVICE')) ||
        (partPrefix.startsWith('719.') && 
         !(parseInt(partPrefix.split('.')[1]) >= 176 && parseInt(partPrefix.split('.')[1]) <= 184)) ||
        // General service parts logic
        ((category === 'SERVICE_PART' || category?.includes('SERVICE')) &&
        !id.includes('t2-dl27') && !id.includes('t2-dl14') && !id.includes('t2-lc1') &&
        !id.includes('leveling-castor') && !id.includes('seismic-feet') &&
        !id.includes('castor') && !id.includes('feet') &&
        !name.includes('leg') && !name.includes('lifter'))
      ) {
        categories['service-parts'].push(item)
      } else {
        categories['other'].push(item)
      }
    })

    return categories
  }

  const getCategoryDisplayName = (categoryId: string) => {
    const displayNames: Record<string, string> = {
      'system': '📋 System Items',
      'sink-body': '🏗️ Sink Body Configuration',
      'basin': '🪣 Basin Configuration',
      'faucet-sprayer': '🚿 Faucet & Sprayer Configuration',
      'control-box': '🎛️ Control Box',
      'accessories': '🔧 General Accessories',
      'accessory-storage': '📦 Storage & Organization',
      'accessory-lighting': '💡 Lighting Accessories',
      'accessory-organization': '🗂️ Organization & Holders',
      'accessory-dispensers': '🧤 Dispensers',
      'accessory-other': '🔧 Other Accessories',
      'service-parts': '⚙️ Service Parts',
      'other': '📦 Other Items'
    }
    return displayNames[categoryId] || categoryId.replace('-', ' ').toUpperCase()
  }

  // Helper function to get parent-child relationship text
  const getRelationshipText = (item: BOMItem): string => {
    const id = (item.assemblyId || item.partNumber || '').toLowerCase()
    const partPrefix = id.match(/^(\d{3}\.\d+)/)?.[1] || ''
    
    // Define parent-child relationships based on part numbers
    if (partPrefix.startsWith('709.')) return 'Sink Body Assembly'
    if (partPrefix >= '711.95' && partPrefix <= '711.101') return 'Legs & Feet'
    if (partPrefix >= '715.120' && partPrefix <= '715.127') return 'Pegboard Size'
    if (partPrefix === '716.128' || partPrefix === '716.130' || partPrefix === '716.131') return 'Pegboard Kit'
    if (partPrefix === '708.77') return 'Pegboard Color'
    if (partPrefix >= '713.107' && partPrefix <= '713.109') return 'Basin Type'
    if (partPrefix >= '712.102' && partPrefix <= '712.106') return 'Basin Size'
    if (partPrefix === '706.65' || partPrefix === '706.67' || partPrefix === '706.68') return 'Basin Add-on'
    if (partPrefix >= '706.58' && partPrefix <= '706.60') return 'Faucet Type'
    if (partPrefix >= '706.61' && partPrefix <= '706.64') return 'Sprayer Type'
    if (partPrefix >= '719.176' && partPrefix <= '719.184') return 'Control Box Type'
    if (partPrefix.startsWith('702.')) return 'Storage Accessory'
    if (partPrefix.startsWith('703.')) return 'Lighting Accessory'
    if (partPrefix.startsWith('704.')) return 'Organization Accessory'
    if (partPrefix.startsWith('705.')) return 'Dispenser Accessory'
    if (partPrefix.startsWith('720.')) return 'General Accessory'
    
    return ''
  }

  const getStatusColor = () => {
    if (!bomData) return 'gray'
    if (bomData.missingRequiredFields.length > 0) return 'yellow'
    return bomData.isComplete ? 'green' : 'yellow'
  }

  const getStatusIcon = () => {
    if (!bomData) return <Package className="w-4 h-4" />
    if (bomData.missingRequiredFields.length > 0) return <AlertCircle className="w-4 h-4" />
    return bomData.isComplete ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />
  }

  const exportBOM = () => {
    if (!bomData) return

    const exportData = {
      timestamp: new Date().toISOString(),
      configuration: orderConfig,
      bom: {
        totalItems: bomData.totalItems,
        items: bomData.items.map(item => ({
          id: item.id || item.assemblyId || item.partNumber,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          category: item.category
        }))
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bom-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredItems = (items: BOMItem[]) => {
    if (!searchTerm) return items
    
    return items.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      const idMatch = (item.id || item.assemblyId || item.partNumber || '').toLowerCase().includes(searchLower)
      const nameMatch = (item.name || '').toLowerCase().includes(searchLower)
      const descMatch = (item.description || '').toLowerCase().includes(searchLower)
      return idMatch || nameMatch || descMatch
    })
  }

  const renderHierarchicalItems = (items: BOMItem[], level = 0, maxLevel = 5): React.ReactNode => {
    const currentConfig = orderConfig || {}
    
    // Prevent infinite recursion
    if (level > maxLevel) {
      return null
    }
    
    // Aggregate items by ID at each level to handle duplicate components
    const aggregatedItems = new Map<string, BOMItem>()
    
    items.forEach((item, originalIndex) => {
      const itemId = item.id || item.assemblyId || item.partNumber || `unknown-${originalIndex}`
      const key = `${itemId}-${item.name || 'unnamed'}`
      
      if (aggregatedItems.has(key)) {
        // Item already exists, combine quantities
        const existingItem = aggregatedItems.get(key)!
        existingItem.quantity = (existingItem.quantity || 1) + (item.quantity || 1)
        
        
        // Merge children if any
        if (item.children || item.components) {
          const existingChildren = existingItem.children || existingItem.components || []
          const newChildren = item.children || item.components || []
          existingItem.children = [...existingChildren, ...newChildren]
          existingItem.components = existingItem.children // Keep both for compatibility
        }
        
        console.log(`🔧 Hierarchical BOM: Aggregated ${itemId} at level ${level} - Total quantity: ${existingItem.quantity}`)
      } else {
        // New item, add with unique index for key generation
        aggregatedItems.set(key, { ...item, _originalIndex: originalIndex })
      }
    })
    
    return Array.from(aggregatedItems.values()).map((item, index) => {
      const hasMatch = !searchTerm || filteredItems([item]).length > 0
      
      const childItems = item.children || item.components || []
      const hasChildren = childItems.length > 0
      
      // Show item if it matches search or has matching children
      const hasMatchingChildren = hasChildren && childItems.some(child => {
        const childMatches = !searchTerm || filteredItems([child]).length > 0
        return childMatches || (child.children || child.components || []).length > 0
      })
      
      if (!hasMatch && !hasMatchingChildren) {
        return null
      }

      // Check if this is a selected component from configuration
      const itemId = (item.id || item.assemblyId || item.partNumber || '').toLowerCase()
      
      // Debug drawer/compartment matching
      if (currentConfig.drawersAndCompartments && currentConfig.drawersAndCompartments.length > 0) {
        const drawerMatch = currentConfig.drawersAndCompartments?.some((d: string) => d.toLowerCase() === itemId)
        if (itemId.includes('drawer') || itemId.includes('stacked') || itemId.includes('pull') || itemId.includes('shelf')) {
          console.log('🔍 Drawer Debug:', {
            itemId,
            itemName: item.name,
            configuredDrawers: currentConfig.drawersAndCompartments,
            matchFound: drawerMatch,
            itemStructure: { id: item.id, assemblyId: item.assemblyId, partNumber: item.partNumber }
          })
        }
      }
      

      // Helper function to check if basin matches (type or size)
      const isSelectedBasin = currentConfig.basins?.some((b: any) => {
        // Check basin type matches
        const basinType = b.basinType || b.basinTypeId
        if (basinType) {
          // Check direct match
          if (basinType.toLowerCase() === itemId) return true
          
          // Check kit assembly ID mapping
          const kitMappings: Record<string, string> = {
            'e_sink': 't2-bsn-esk-kit',
            'e_sink_di': 't2-bsn-esk-di-kit',
            'e_drain': 't2-bsn-edr-kit'
          }
          
          if (kitMappings[basinType.toLowerCase()] === itemId) return true
        }
        
        // Check basin size matches
        const basinSize = b.basinSize || b.basinSizePartNumber
        if (basinSize) {
          // Check direct match
          if (basinSize.toLowerCase() === itemId) return true
          
          // Check assembly ID match (like 712.104)
          if (basinSize === itemId) return true
          
          // Map configurator assembly IDs to actual assembly names for comparison
          const assemblyIdToName: Record<string, string> = {
            '712.102': 't2-adw-basin20x20x8',
            '712.103': 't2-adw-basin24x20x8',
            '712.104': 't2-adw-basin24x20x10',
            '712.105': 't2-adw-basin30x20x8',
            '712.106': 't2-adw-basin30x20x10'
          }
          
          // Check if user selected assembly ID maps to BOM item name
          if (assemblyIdToName[basinSize] === itemId) return true
          
          // Check size assembly ID mapping
          const sizeMappings: Record<string, string> = {
            '20x20x8': 't2-adw-basin20x20x8',
            '24x20x8': 't2-adw-basin24x20x8',
            '24x20x10': 't2-adw-basin24x20x10',
            '30x20x8': 't2-adw-basin30x20x8',
            '30x20x10': 't2-adw-basin30x20x10'
          }
          
          if (sizeMappings[basinSize.toLowerCase()] === itemId) return true
          
          // Check part number pattern (like 712.104)
          const partNumberPattern = basinSize.match(/^(\d{3}\.\d+)/)
          if (partNumberPattern && partNumberPattern[1] === itemId) return true
          
          // Check custom basin format
          if (basinSize.includes('x') || basinSize.includes('X')) {
            const customPattern = `720.215.001 t2-adw-basin-${basinSize.toLowerCase()}`
            if (customPattern === itemId) return true
          }
        }
        
        return false
      })
      
      // Check if this is a pegboard-related component
      const isPegboardComponent = currentConfig.pegboard && (
        // Check specific pegboard kit ID
        itemId === currentConfig.specificPegboardKitId?.toLowerCase() ||
        // Check calculated pegboard kit ID
        (currentConfig.length && currentConfig.pegboardType && currentConfig.pegboardColor && 
         itemId === getPegboardKitId(currentConfig.length, currentConfig.pegboardType, currentConfig.pegboardColor).toLowerCase()) ||
        // Check pegboard mandatory components
        itemId === 't2-ohl-mdrd-kit' ||
        (currentConfig.pegboardType === 'PERFORATED' && itemId === 't2-adw-pb-perf-kit') ||
        (currentConfig.pegboardType === 'SOLID' && itemId === 't2-adw-pb-solid-kit') ||
        // Check pegboard color component
        itemId === 't-oa-pb-color' ||
        // Check pegboard size components
        (itemId.includes('t2-adw-pb-') && (itemId.includes('3436') || itemId.includes('4836') || 
         itemId.includes('6036') || itemId.includes('7236') || itemId.includes('8436') || 
         itemId.includes('9636') || itemId.includes('10836') || itemId.includes('12036')))
      )
      
      // Debug pegboard component detection
      if (currentConfig.pegboard && (itemId.includes('pegboard') || itemId.includes('pb-') || itemId.includes('ohl-'))) {
        console.log('🔍 Pegboard Debug - Item Detection:', {
          itemId,
          itemName: item.name,
          pegboardEnabled: currentConfig.pegboard,
          specificPegboardKitId: currentConfig.specificPegboardKitId,
          pegboardType: currentConfig.pegboardType,
          pegboardColor: currentConfig.pegboardColor,
          sinkLength: currentConfig.length,
          calculatedKitId: currentConfig.length && currentConfig.pegboardType && currentConfig.pegboardColor ? 
            getPegboardKitId(currentConfig.length, currentConfig.pegboardType, currentConfig.pegboardColor) : 'N/A',
          isPegboardComponent,
          matchReasons: {
            specificKit: itemId === currentConfig.specificPegboardKitId?.toLowerCase(),
            calculatedKit: currentConfig.length && currentConfig.pegboardType && currentConfig.pegboardColor && 
                          itemId === getPegboardKitId(currentConfig.length, currentConfig.pegboardType, currentConfig.pegboardColor).toLowerCase(),
            mandatoryOHL: itemId === 't2-ohl-mdrd-kit',
            perfKit: currentConfig.pegboardType === 'PERFORATED' && itemId === 't2-adw-pb-perf-kit',
            solidKit: currentConfig.pegboardType === 'SOLID' && itemId === 't2-adw-pb-solid-kit',
            colorComponent: itemId === 't-oa-pb-color',
            sizeComponent: itemId.includes('t2-adw-pb-') && (itemId.includes('3436') || itemId.includes('4836') || 
                          itemId.includes('6036') || itemId.includes('7236') || itemId.includes('8436') || 
                          itemId.includes('9636') || itemId.includes('10836') || itemId.includes('12036'))
          }
        })
      }

      const isSelectedComponent = 
        itemId === currentConfig.legsTypeId?.toLowerCase() ||
        itemId === currentConfig.feetTypeId?.toLowerCase() ||
        itemId === currentConfig.controlBoxId?.toLowerCase() ||
        isPegboardComponent ||
        isSelectedBasin ||
        currentConfig.faucets?.some((f: any) => f.faucetTypeId?.toLowerCase() === itemId) ||
        currentConfig.sprayers?.some((s: any) => s.sprayerTypeId?.toLowerCase() === itemId) ||
        currentConfig.drawersAndCompartments?.some((d: string) => d.toLowerCase() === itemId)

      const relationshipText = getRelationshipText(item)
      
      // Different visual styles based on level
      const getLevelStyle = (level: number) => {
        const baseClasses = "p-2 border rounded-md mb-1"
        const marginLeft = level * 16 // Reduce margin for better space usage
        
        if (level === 0) {
          return {
            className: `${baseClasses} ${isSelectedComponent ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-300'}`,
            marginLeft: 0
          }
        } else if (level === 1) {
          return {
            className: `${baseClasses} bg-gray-50 border-gray-200`,
            marginLeft
          }
        } else if (level === 2) {
          return {
            className: `${baseClasses} bg-gray-100 border-gray-300`,
            marginLeft
          }
        } else {
          return {
            className: `${baseClasses} bg-gray-200 border-gray-400`,
            marginLeft
          }
        }
      }
      
      const levelStyle = getLevelStyle(level)
      
      // Different indentation symbols based on level
      const getIndentSymbol = (level: number) => {
        if (level === 0) return null
        if (level === 1) return "└─"
        if (level === 2) return "  └─"
        return "    └─"
      }
      
      const indentSymbol = getIndentSymbol(level)

      return (
        <div key={`${item.id || item.assemblyId || item.partNumber || 'unknown'}-${level}-${index}-${item._originalIndex || 0}`}>
          {(hasMatch || level === 0) && (
            <div 
              className={levelStyle.className}
              style={{ marginLeft: `${levelStyle.marginLeft}px` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {indentSymbol && (
                      <span className={`text-xs ${level > 2 ? 'text-gray-600' : 'text-gray-400'}`}>
                        {indentSymbol}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm truncate ${
                          level === 0 ? 'font-medium' : level === 1 ? 'font-normal' : 'font-light'
                        } ${isSelectedComponent && level === 0 ? 'text-blue-700' : ''}`}>
                          {item.id || item.assemblyId || item.partNumber || 'Unknown ID'}
                        </p>
                        {relationshipText && level < 3 && (
                          <Badge variant="secondary" className="text-xs">
                            {relationshipText}
                          </Badge>
                        )}
                        {level > 0 && (
                          <Badge variant="outline" className="text-xs">
                            L{level}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs truncate ${
                        level > 2 ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {item.name || item.description || 'No description'}
                      </p>
                      {isSelectedComponent && level === 0 && (
                        <p className="text-xs text-blue-600 font-medium">
                          ✓ Selected Component
                        </p>
                      )}
                      {item.sourceContexts && item.sourceContexts.length > 1 && (
                        <p className="text-xs text-purple-600 font-medium">
                          📊 Qty aggregated from {item.sourceContexts.length} sources
                        </p>
                      )}
                      {hasChildren && (
                        <p className={`text-xs ${
                          level === 0 ? 'text-purple-600' : 
                          level === 1 ? 'text-purple-500' : 'text-purple-400'
                        }`}>
                          → Contains {childItems.length} component{childItems.length > 1 ? 's' : ''}
                          {level < 2 && childItems.some(child => (child.children || child.components || []).length > 0) && (
                            <span className="ml-1">(with sub-components)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={isSelectedComponent && level === 0 ? "default" : "outline"} className="text-xs">
                    Qty: {item.quantity || 1}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          {hasChildren && level < maxLevel && (
            <div className="mt-1">
              {renderHierarchicalItems(childItems, level + 1, maxLevel)}
            </div>
          )}
          {level >= maxLevel && hasChildren && (
            <div 
              className="p-1 border border-dashed border-gray-300 rounded text-xs text-gray-500 italic"
              style={{ marginLeft: `${(level + 1) * 16}px` }}
            >
              ... {childItems.length} more sub-component{childItems.length > 1 ? 's' : ''} (max depth reached)
            </div>
          )}
        </div>
      )
    })
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Eye className="w-4 h-4 mr-2" />
        Show BOM Debug
      </Button>
    )
  }

  const categorizedItems = bomData ? categorizeItems(filteredItems(bomData.items)) : {}
  const currentConfig = orderConfig || {}

  return (
    <Card className="fixed top-4 right-4 w-[450px] max-h-[90vh] z-50 shadow-xl border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">BOM Debug Helper</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {bomData && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'categorized' ? 'hierarchical' : 'categorized')}
                  title="Toggle view mode"
                >
                  {viewMode === 'categorized' ? <TreePine className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </Button>
                {viewMode === 'hierarchical' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaxDepth(Math.max(1, maxDepth - 1))}
                      disabled={maxDepth <= 1}
                      title="Decrease depth"
                    >
                      <span className="text-xs">-</span>
                    </Button>
                    <span className="text-xs px-1 min-w-[20px] text-center">{maxDepth}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaxDepth(Math.min(6, maxDepth + 1))}
                      disabled={maxDepth >= 6}
                      title="Increase depth"
                    >
                      <span className="text-xs">+</span>
                    </Button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportBOM}
                  title="Export BOM"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={generateBOMPreview}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {bomData && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant={getStatusColor() === 'green' ? 'default' : 'secondary'}>
                {bomData.totalItems} total items
              </Badge>
              {bomData.topLevelItems > 0 && (
                <Badge variant="outline">
                  {bomData.topLevelItems} assemblies
                </Badge>
              )}
              {bomData.missingRequiredFields.length > 0 && (
                <Badge variant="destructive">
                  {bomData.missingRequiredFields.length} missing
                </Badge>
              )}
            </div>
            {searchTerm && (
              <div className="text-xs text-muted-foreground">
                Filtering: {filteredItems(bomData.items).length} matches
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {bomData && (
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search BOM items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        )}
        
        <ScrollArea className="h-[65vh]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Generating BOM...</span>
            </div>
          )}

          {bomData && !loading && (
            <div className="space-y-2">
              {/* Missing Fields Warning */}
              {bomData.missingRequiredFields.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Incomplete BOM - Missing:</p>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        {bomData.missingRequiredFields.map((field, index) => (
                          <li key={index}>• {field}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-yellow-600 mt-2">
                        Enter sink dimensions to generate complete BOM including sink body assembly.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Accessory Analysis */}
              {accessoryAnalysis && accessoryAnalysis.totalAccessories > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        🔧 Accessories Analysis ({accessoryAnalysis.totalAccessories} items)
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-blue-700">📦 Storage:</span>
                            <Badge variant="secondary" className="text-xs">
                              {accessoryAnalysis.byCategory.storage}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">💡 Lighting:</span>
                            <Badge variant="secondary" className="text-xs">
                              {accessoryAnalysis.byCategory.lighting}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-blue-700">🗂️ Organization:</span>
                            <Badge variant="secondary" className="text-xs">
                              {accessoryAnalysis.byCategory.organization}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">🧤 Dispensers:</span>
                            <Badge variant="secondary" className="text-xs">
                              {accessoryAnalysis.byCategory.dispensers}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {(accessoryAnalysis.hasLighting || accessoryAnalysis.hasStorage || 
                        accessoryAnalysis.hasOrganization || accessoryAnalysis.hasDispensers) && (
                        <div className="mt-2 pt-2 border-t border-blue-300">
                          <p className="text-xs text-blue-600 mb-1">Features included:</p>
                          <div className="flex flex-wrap gap-1">
                            {accessoryAnalysis.hasLighting && (
                              <Badge variant="outline" className="text-xs">💡 Lighting</Badge>
                            )}
                            {accessoryAnalysis.hasStorage && (
                              <Badge variant="outline" className="text-xs">📦 Storage</Badge>
                            )}
                            {accessoryAnalysis.hasOrganization && (
                              <Badge variant="outline" className="text-xs">🗂️ Organization</Badge>
                            )}
                            {accessoryAnalysis.hasDispensers && (
                              <Badge variant="outline" className="text-xs">🧤 Dispensers</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* View Mode Toggle */}
              {viewMode === 'hierarchical' && bomData.hierarchical && bomData.hierarchical.length > 0 ? (
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-3">
                    <p className="text-sm font-medium text-blue-800 mb-1">Parent → Child → Grandchild Hierarchy</p>
                    <p className="text-xs text-blue-600">
                      Shows complete component relationships including sub-assemblies and individual parts (depth: {maxDepth} levels).
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      Use +/- controls to adjust hierarchy depth. L1, L2, L3+ badges show component levels.
                    </p>
                  </div>
                  {renderHierarchicalItems(bomData.hierarchical, 0, maxDepth)}
                </div>
              ) : (
                /* BOM Categories */
                Object.entries(categorizedItems).map(([categoryId, items]) => {
                if (items.length === 0) return null
                
                const isExpanded = expandedCategories.has(categoryId)
                
                return (
                  <Collapsible key={categoryId} open={isExpanded} onOpenChange={() => toggleCategory(categoryId)}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-gray-50 rounded-md hover:bg-gray-100">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium text-sm">
                          {getCategoryDisplayName(categoryId)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {items.length}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="ml-4 mt-1 space-y-1">
                      {items.map((item, index) => {
                        const indentLevel = item.indentLevel || item.level || 0
                        const isChild = item.isChild || indentLevel > 0
                        const isPart = item.isPart || item.category === 'PART'
                        
                        const relationshipText = getRelationshipText(item)
                        
                        // Check if this is a selected component
                        const itemId = (item.id || item.assemblyId || item.partNumber || '').toLowerCase()
                        
                        // Helper function to check if basin matches (type or size)
                        const isSelectedBasin = currentConfig.basins?.some((b: any) => {
                          // Check basin type matches
                          const basinType = b.basinType || b.basinTypeId
                          if (basinType) {
                            // Check direct match
                            if (basinType.toLowerCase() === itemId) return true
                            
                            // Check kit assembly ID mapping
                            const kitMappings: Record<string, string> = {
                              'e_sink': 't2-bsn-esk-kit',
                              'e_sink_di': 't2-bsn-esk-di-kit',
                              'e_drain': 't2-bsn-edr-kit'
                            }
                            
                            if (kitMappings[basinType.toLowerCase()] === itemId) return true
                          }
                          
                          // Check basin size matches
                          const basinSize = b.basinSize || b.basinSizePartNumber
                          if (basinSize) {
                            // Check direct match
                            if (basinSize.toLowerCase() === itemId) return true
                            
                            // Check assembly ID match (like 712.104)
                            if (basinSize === itemId) return true
                            
                            // Map configurator assembly IDs to actual assembly names for comparison
                            const assemblyIdToName: Record<string, string> = {
                              '712.102': 't2-adw-basin20x20x8',
                              '712.103': 't2-adw-basin24x20x8',
                              '712.104': 't2-adw-basin24x20x10',
                              '712.105': 't2-adw-basin30x20x8',
                              '712.106': 't2-adw-basin30x20x10'
                            }
                            
                            // Check if user selected assembly ID maps to BOM item name
                            if (assemblyIdToName[basinSize] === itemId) return true
                            
                            // Check size assembly ID mapping
                            const sizeMappings: Record<string, string> = {
                              '20x20x8': 't2-adw-basin20x20x8',
                              '24x20x8': 't2-adw-basin24x20x8',
                              '24x20x10': 't2-adw-basin24x20x10',
                              '30x20x8': 't2-adw-basin30x20x8',
                              '30x20x10': 't2-adw-basin30x20x10'
                            }
                            
                            if (sizeMappings[basinSize.toLowerCase()] === itemId) return true
                            
                            // Check part number pattern (like 712.104)
                            const partNumberPattern = basinSize.match(/^(\d{3}\.\d+)/)
                            if (partNumberPattern && partNumberPattern[1] === itemId) return true
                            
                            // Check custom basin format
                            if (basinSize.includes('x') || basinSize.includes('X')) {
                              const customPattern = `720.215.001 t2-adw-basin-${basinSize.toLowerCase()}`
                              if (customPattern === itemId) return true
                            }
                          }
                          
                          return false
                        })
                        
                        
                        // Check if this is a pegboard-related component
                        const isPegboardComponent = currentConfig.pegboard && (
                          // Check specific pegboard kit ID
                          itemId === currentConfig.specificPegboardKitId?.toLowerCase() ||
                          // Check calculated pegboard kit ID
                          (currentConfig.length && currentConfig.pegboardType && currentConfig.pegboardColor && 
                           itemId === getPegboardKitId(currentConfig.length, currentConfig.pegboardType, currentConfig.pegboardColor).toLowerCase()) ||
                          // Check pegboard mandatory components
                          itemId === 't2-ohl-mdrd-kit' ||
                          (currentConfig.pegboardType === 'PERFORATED' && itemId === 't2-adw-pb-perf-kit') ||
                          (currentConfig.pegboardType === 'SOLID' && itemId === 't2-adw-pb-solid-kit') ||
                          // Check pegboard color component
                          itemId === 't-oa-pb-color' ||
                          // Check pegboard size components
                          (itemId.includes('t2-adw-pb-') && (itemId.includes('3436') || itemId.includes('4836') || 
                           itemId.includes('6036') || itemId.includes('7236') || itemId.includes('8436') || 
                           itemId.includes('9636') || itemId.includes('10836') || itemId.includes('12036')))
                        )
                        
                        // Debug pegboard component detection (categorized view)
                        if (currentConfig.pegboard && (itemId.includes('pegboard') || itemId.includes('pb-') || itemId.includes('ohl-'))) {
                          console.log('🔍 Pegboard Debug - Categorized View:', {
                            itemId,
                            itemName: item.name,
                            pegboardEnabled: currentConfig.pegboard,
                            isPegboardComponent
                          })
                        }
                        
                        const isSelectedComponent = 
                          itemId === currentConfig.legsTypeId?.toLowerCase() ||
                          itemId === currentConfig.feetTypeId?.toLowerCase() ||
                          itemId === currentConfig.controlBoxId?.toLowerCase() ||
                          isPegboardComponent ||
                          isSelectedBasin ||
                          currentConfig.faucets?.some((f: any) => f.faucetTypeId?.toLowerCase() === itemId) ||
                          currentConfig.sprayers?.some((s: any) => s.sprayerTypeId?.toLowerCase() === itemId)
                        
                        return (
                          <div 
                            key={`${categoryId}-${item.id || item.assemblyId || item.partNumber || 'unknown'}-${index}`} 
                            className={`p-2 border rounded-md ${
                              isChild ? 'bg-gray-50 border-gray-200 ml-4' : 
                              isSelectedComponent ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-300'
                            }`}
                            style={{ marginLeft: `${indentLevel * 16}px` }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isChild && (
                                    <span className="text-xs text-gray-400">
                                      {'└─'.repeat(Math.min(indentLevel, 3))}
                                    </span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm truncate ${isChild ? 'font-normal' : 'font-medium'} ${
                                        isSelectedComponent ? 'text-blue-700' : ''
                                      }`}>
                                        {item.id || item.assemblyId || item.partNumber || 'Unknown ID'}
                                      </p>
                                      {relationshipText && (
                                        <Badge variant="secondary" className="text-xs">
                                          {relationshipText}
                                        </Badge>
                                      )}
                                    </div>
                                    {item.partNumber && item.partNumber !== item.id && (
                                      <p className="text-xs text-green-600 truncate">
                                        Part: {item.partNumber}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 truncate">
                                      {item.name || item.description || 'No description'}
                                    </p>
                                    {item.category && (
                                      <p className="text-xs text-blue-600 truncate">
                                        {isPart ? 'Part' : 'Assembly'} • {item.category}
                                      </p>
                                    )}
                                    {isSelectedComponent && !isChild && (
                                      <p className="text-xs text-blue-600 font-medium">
                                        ✓ Selected Component
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  {(item.hasChildren || (item.components && item.components.length > 0)) && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.children?.length || item.components?.length || 0} items
                                    </Badge>
                                  )}
                                  <Badge variant={isSelectedComponent ? "default" : "outline"} className="text-xs">
                                    Qty: {item.quantity || 1}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })
              )}
            </div>
          )}

          {!bomData && !loading && !error && (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Configure sink to see BOM preview</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}