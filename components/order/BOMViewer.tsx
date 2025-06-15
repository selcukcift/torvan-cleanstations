"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Download, 
  FileText, 
  ChevronRight,
  ChevronDown,
  Loader2,
  Info,
  FolderOpen,
  Folder,
  FileIcon,
  Layers,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

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
  type?: string
  isCustom?: boolean
  parentId?: string
  itemType?: string
  sourceContext?: string
}

interface EnhancedBOMItem extends BOMItem {
  aggregatedQuantity?: number
  isAggregated?: boolean
  sourceInfo?: string[]
}

interface BOMViewerProps {
  orderId?: string
  poNumber?: string
  bomItems?: BOMItem[]
  orderData?: any
  customerInfo?: any
  onExport?: (format: 'pdf') => void
  showDebugInfo?: boolean
}

export function BOMViewer({ orderId, poNumber, bomItems, orderData, customerInfo, onExport, showDebugInfo = false }: BOMViewerProps) {
  const { toast } = useToast()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState<boolean>(false)
  
  // For preview mode (when orderData is provided)
  const [previewBomItems, setPreviewBomItems] = useState<BOMItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Enhanced pegboard kit mapping function
  const getPegboardKitId = (sinkLength: number, pegboardType: string, color: string) => {
    const pegboardSizes = [
      { size: '3436', covers: [34, 47] },
      { size: '4836', covers: [48, 59] },
      { size: '6036', covers: [60, 71] },
      { size: '7236', covers: [72, 83] },
      { size: '8436', covers: [84, 95] },
      { size: '9636', covers: [95, 107] },
      { size: '10836', covers: [108, 119] },
      { size: '12036', covers: [120, 140] }
    ]

    const applicableSize = pegboardSizes.find(size => 
      sinkLength >= size.covers[0] && sinkLength <= size.covers[1]
    )

    if (!applicableSize) {
      console.warn(`No pegboard size found for sink length: ${sinkLength}`)
      return null
    }

    const typeMap: Record<string, string> = {
      'STANDARD': 'SPB',
      'PREMIUM': 'PPB'
    }

    const colorMap: Record<string, string> = {
      'WHITE': 'W',
      'GREY': 'G', 
      'BLACK': 'B'
    }

    const typeCode = typeMap[pegboardType] || 'SPB'
    const colorCode = colorMap[color] || 'W'

    return `T2-${typeCode}-${applicableSize.size}-${colorCode}`
  }

  // Assembly ID mapping for basins
  const getBasinAssemblyId = (basinType: string, basinSize: string) => {
    const basinTypeMap: Record<string, string> = {
      'E_SINK': 'ESINK',
      'E_SINK_DI': 'ESINK-DI',
      'E_DRAIN': 'EDRAIN'
    }
    
    const mappedType = basinTypeMap[basinType] || basinType
    return `T2-${mappedType}-${basinSize}`
  }

  // Generate BOM preview using the same logic as BOMDebugHelper
  const generateBOMPreview = useCallback(async (retryCount = 0) => {
    if (!orderData) return

    setLoading(true)
    setError(null)
    
    try {
      // Use the EXACT same data structure as BOMDebugHelper for consistency
      const configData: any = {
        sinkModelId: orderData.sinkModelId
      }

      // Add optional fields only if they exist (same as BOMDebugHelper)
      if (orderData.width) configData.width = orderData.width
      if (orderData.length) configData.length = orderData.length
      if (orderData.legsTypeId) configData.legsTypeId = orderData.legsTypeId
      if (orderData.feetTypeId) configData.feetTypeId = orderData.feetTypeId
      if (orderData.pegboard) {
        configData.pegboard = orderData.pegboard
        if (orderData.pegboardTypeId) configData.pegboardTypeId = orderData.pegboardTypeId
        if (orderData.pegboardColorId) configData.pegboardColorId = orderData.pegboardColorId
        
        // Extract pegboard type and color from IDs (same logic as BOMDebugHelper)
        const pegboardType = orderData.pegboardTypeId || orderData.pegboardType
        let pegboardColor = orderData.pegboardColor
        
        if (!pegboardColor && orderData.pegboardColorId && orderData.pegboardColorId !== 'none') {
          const colorMatch = orderData.pegboardColorId.match(/T-OA-PB-COLOR-(.+)/)
          if (colorMatch) {
            pegboardColor = colorMatch[1]
          }
        }
        
        if (orderData.length && pegboardType) {
          const specificKitId = getPegboardKitId(orderData.length, pegboardType, pegboardColor)
          configData.specificPegboardKitId = specificKitId
        }
        
        configData.pegboardType = pegboardType
        configData.pegboardColor = pegboardColor
      }
      if (orderData.workflowDirection) configData.workflowDirection = orderData.workflowDirection

      // Add drawers & compartments if configured (CRITICAL FIX)
      if (orderData.drawersAndCompartments && orderData.drawersAndCompartments.length > 0) {
        configData.drawersAndCompartments = orderData.drawersAndCompartments
      }

      // Add basins if configured (same processing as BOMDebugHelper)
      if (orderData.basins && orderData.basins.length > 0) {
        configData.basins = orderData.basins.map((basin: any) => {
          const basinData: any = {}
          
          if (basin.basinType || basin.basinTypeId) {
            const basinTypeValue = basin.basinType || basin.basinTypeId
            let kitAssemblyId = basinTypeValue
            
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
            }
            basinData.basinTypeId = kitAssemblyId
          }
          
          if (basin.basinSizePartNumber || basin.basinSize) {
            let sizePartNumber = basin.basinSizePartNumber || basin.basinSize
            
            if (sizePartNumber === 'CUSTOM') {
              if (basin.customWidth && basin.customLength && basin.customDepth) {
                const customDimensions = `${basin.customWidth}X${basin.customLength}X${basin.customDepth}`
                sizePartNumber = `720.215.001`
                basinData.customPartNumber = `T2-ADW-BASIN-${customDimensions}`
                basinData.customDimensions = customDimensions
              }
            } else if (basin.basinSize && basin.basinSize !== 'CUSTOM') {
              const normalizedDimensions = basin.basinSize.toUpperCase()
              sizePartNumber = `720.215.001`
              basinData.customPartNumber = `T2-ADW-BASIN-${normalizedDimensions}`
              basinData.customDimensions = normalizedDimensions
            }
            
            if (sizePartNumber) {
              basinData.basinSizePartNumber = sizePartNumber
            }
          }
          
          if (basin.addonIds && basin.addonIds.length > 0) basinData.addonIds = basin.addonIds
          return basinData
        }).filter((basin: any) => basin.basinTypeId || basin.basinSizePartNumber || (basin.addonIds && basin.addonIds.length > 0))
      }

      // Add faucets if configured (same processing as BOMDebugHelper)
      if (orderData.faucets && orderData.faucets.length > 0) {
        configData.faucets = orderData.faucets.map((faucet: any) => ({
          faucetTypeId: faucet.faucetTypeId,
          quantity: 1
        })).filter((faucet: any) => faucet.faucetTypeId)
      }

      // Add sprayers if configured (same processing as BOMDebugHelper)
      if (orderData.sprayers && orderData.sprayers.length > 0) {
        configData.sprayers = orderData.sprayers.map((sprayer: any) => ({
          id: sprayer.id,
          sprayerTypeId: sprayer.sprayerTypeId,
          location: sprayer.location
        })).filter((sprayer: any) => sprayer.sprayerTypeId)
      }

      if (orderData.controlBoxId) configData.controlBoxId = orderData.controlBoxId

      // Use the BOM service directly (same as BOMDebugHelper)
      const response = await nextJsApiClient.post('/bom/generate', {
        orderId: 'preview',
        buildNumber: 'preview-001',
        orderConfig: configData
      })
      
      if (response.data.success) {
        const bomResult = response.data.data
        // Use hierarchical data if available, otherwise flattened
        const items = bomResult.hierarchical || bomResult.flattened || []
        setPreviewBomItems(items)
      } else {
        setError(response.data.error || 'Failed to generate BOM preview')
      }
    } catch (err: any) {
      console.error('BOM preview error:', err)
      
      // Handle rate limiting with exponential backoff
      if (err.response?.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000
        console.log(`Rate limited, retrying in ${delay}ms...`)
        setTimeout(() => {
          generateBOMPreview(retryCount + 1)
        }, delay)
        return
      }
      
      setError(
        err.response?.status === 429 
          ? 'Rate limit exceeded. Please wait a moment and try again.'
          : 'Failed to generate BOM preview: ' + (err.message || 'Unknown error')
      )
    } finally {
      if (retryCount === 0) {
        setLoading(false)
      }
    }
  }, [orderData, customerInfo])

  // Auto-generate preview when orderData changes (with debouncing to prevent rate limits)
  useEffect(() => {
    if (orderData && !bomItems) {
      // Add a small delay to prevent multiple simultaneous requests
      const timer = setTimeout(() => {
        generateBOMPreview()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [orderData, bomItems, generateBOMPreview])

  // Auto-expand hierarchical assemblies when BOM is loaded
  useEffect(() => {
    const itemsToUse = bomItems || previewBomItems
    if (itemsToUse && itemsToUse.length > 0) {
      const itemsToExpand = new Set<string>()
      
      // Find all assemblies with sub-components to auto-expand
      const findExpandableItems = (items: BOMItem[], depth: number = 0) => {
        items.forEach(item => {
          const itemId = item.id || item.assemblyId || item.partNumber
          const childItems = item.children || item.subItems || item.components || []
          
          // Auto-expand:
          // 1. All top-level assemblies (depth 0)
          // 2. Key assembly types (sink bodies, basin kits, etc.)
          // 3. Any assembly with sub-components
          if (itemId && (
            depth === 0 || // Top level
            itemId.includes('T2-BODY-') || // Sink bodies
            itemId.includes('T2-BSN-') || // Basin kits
            itemId.includes('T2-VALVE-') || // Valve assemblies
            itemId.includes('T2-DRAIN-') || // Drain assemblies
            itemId.includes('-KIT') || // Kit assemblies
            (childItems.length > 0 && depth < 2) // Any assembly with children (up to 2 levels deep)
          )) {
            itemsToExpand.add(itemId)
          }
          
          // Recursively check children
          if (childItems.length > 0) {
            findExpandableItems(childItems, depth + 1)
          }
        })
      }
      
      findExpandableItems(itemsToUse)
      
      if (itemsToExpand.size > 0) {
        console.log(`🔍 Auto-expanding ${itemsToExpand.size} hierarchical assemblies`)
        setExpandedItems(prev => new Set([...prev, ...itemsToExpand]))
      }
      
      // Run debug function to understand BOM structure
      debugBOMStructure()
    }
  }, [bomItems, previewBomItems, showDebugInfo])

  // Determine which items to use - either provided bomItems or generated previewBomItems
  const actualBomItems = bomItems || previewBomItems

  // Hierarchical quantity aggregation - preserves tree structure while combining identical items within same level
  const aggregatedBomItems = useMemo(() => {
    if (!actualBomItems || actualBomItems.length === 0) return []

    const aggregateWithinHierarchy = (items: BOMItem[]): EnhancedBOMItem[] => {
      const itemMap = new Map<string, EnhancedBOMItem>()
      
      items.forEach(item => {
        const key = item.assemblyId || item.partNumber || item.id || item.name
        
        if (itemMap.has(key)) {
          // Aggregate identical items within this level
          const existing = itemMap.get(key)!
          existing.aggregatedQuantity = (existing.aggregatedQuantity || existing.quantity) + item.quantity
          existing.isAggregated = true
          if (!existing.sourceInfo) existing.sourceInfo = []
          existing.sourceInfo.push(item.sourceContext || 'duplicate')
        } else {
          // First occurrence of this item at this level
          const enhancedItem: EnhancedBOMItem = {
            ...item,
            aggregatedQuantity: item.quantity,
            isAggregated: false,
            sourceInfo: item.sourceContext ? [item.sourceContext] : []
          }
          
          // Recursively aggregate children while preserving hierarchy
          const childItems = item.children || item.subItems || item.components || []
          if (childItems.length > 0) {
            enhancedItem.children = aggregateWithinHierarchy(childItems)
            enhancedItem.subItems = enhancedItem.children // Support both property names
          }
          
          itemMap.set(key, enhancedItem)
        }
      })
      
      return Array.from(itemMap.values())
    }

    return aggregateWithinHierarchy(actualBomItems)
  }, [actualBomItems])

  // Calculate hierarchical statistics without flattening to avoid duplication
  const getHierarchicalStats = useMemo(() => {
    const calculateStats = (items: EnhancedBOMItem[]): { uniqueItems: number, totalQuantity: number, leafItems: number, leafQuantity: number } => {
      if (!items || items.length === 0) return { uniqueItems: 0, totalQuantity: 0, leafItems: 0, leafQuantity: 0 }
      
      let uniqueItems = 0
      let totalQuantity = 0
      let leafItems = 0
      let leafQuantity = 0
      
      items.forEach(item => {
        uniqueItems += 1
        const itemQty = item.aggregatedQuantity || item.quantity || 0
        totalQuantity += itemQty
        
        const childItems = item.children || item.subItems || []
        if (childItems.length === 0) {
          // This is a leaf item (actual part)
          leafItems += 1
          leafQuantity += itemQty
        } else {
          // This is an assembly, recursively calculate children stats
          const childStats = calculateStats(childItems)
          uniqueItems += childStats.uniqueItems
          totalQuantity += childStats.totalQuantity
          leafItems += childStats.leafItems
          leafQuantity += childStats.leafQuantity
        }
      })
      
      return { uniqueItems, totalQuantity, leafItems, leafQuantity }
    }
    
    return calculateStats(aggregatedBomItems)
  }, [aggregatedBomItems])



  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const expandAll = () => {
    const allItemIds = new Set<string>()
    const collectIds = (items: BOMItem[]) => {
      if (!items) return
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          allItemIds.add(item.id)
          collectIds(item.children)
        }
      })
    }
    if (actualBomItems) {
      collectIds(actualBomItems)
    }
    setExpandedItems(allItemIds)
  }

  const collapseAll = () => {
    setExpandedItems(new Set())
  }

  const handleExportPDF = async () => {
    if (onExport) {
      onExport('pdf')
      return
    }

    // Validate orderId exists before attempting export
    if (!orderId) {
      toast({
        title: "Export Not Available",
        description: "PDF export is only available for saved orders. Please save the order first.",
        variant: "destructive"
      })
      return
    }

    try {
      setExporting(true)
      const response = await nextJsApiClient.get(
        `/orders/${orderId}/bom-export?format=pdf`,
        { 
          responseType: 'blob',
          timeout: 30000
        }
      )

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Extract filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition']
      let filename = `bom_${poNumber || 'preview'}_${new Date().toISOString().split('T')[0]}.pdf`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: "BOM exported as PDF successfully"
      })
    } catch (error: any) {
      console.error('BOM export error:', error)
      let errorMessage = "Failed to export BOM as PDF"
      
      if (error.response?.status === 404) {
        errorMessage = "Order not found. Please ensure the order exists and try again."
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to export this order's BOM."
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const getTotalQuantity = () => {
    // Calculate total quantity from hierarchical structure (no duplication)
    return getHierarchicalStats.totalQuantity
  }

  const getUniqueItems = () => {
    // Count unique items from hierarchical structure (no duplication)
    return getHierarchicalStats.uniqueItems
  }

  // Alternative counting methods for better accuracy
  const getLeafItemsCount = () => {
    // Count only leaf items (parts without children) from hierarchical stats
    return getHierarchicalStats.leafItems
  }

  const getLeafItemsQuantity = () => {
    // Sum quantities of only leaf items (parts without children) from hierarchical stats
    return getHierarchicalStats.leafQuantity
  }

  // Debug function to understand BOM structure
  const debugBOMStructure = () => {
    if (showDebugInfo) {
      console.log('🔍 BOM Debug Information:')
      console.log('Raw BOM Items:', actualBomItems)
      console.log('Processed Items Count:', processedItems.length)
      console.log('Processed Items:', processedItems)
      
      // Count items in hierarchical structure
      const countHierarchicalItems = (items: BOMItem[]): { count: number, totalQty: number } => {
        if (!items || items.length === 0) return { count: 0, totalQty: 0 }
        
        let count = 0
        let totalQty = 0
        
        items.forEach(item => {
          count += 1
          totalQty += item.quantity || 0
          
          const childItems = item.children || item.subItems || []
          if (childItems.length > 0) {
            const childStats = countHierarchicalItems(childItems)
            count += childStats.count
            totalQty += childStats.totalQty
          }
        })
        
        return { count, totalQty }
      }
      
      const hierarchicalStats = countHierarchicalItems(actualBomItems || [])
      console.log('Hierarchical Stats (All Items):', hierarchicalStats)
      
      // Hierarchical stats (no duplication)
      console.log('Hierarchical Stats (No Duplication):', getHierarchicalStats)
      
      // Leaf items stats
      const leafCount = getLeafItemsCount()
      const leafQty = getLeafItemsQuantity()
      console.log('Leaf Items Stats (Parts Only):', { count: leafCount, totalQty: leafQty })
      
      // Summary
      console.log('📊 Summary of Counting Methods:')
      console.log(`- All Items (Including Assemblies): ${hierarchicalStats.count} items, ${hierarchicalStats.totalQty} total quantity`)
      console.log(`- Hierarchical Stats (No Duplication): ${getHierarchicalStats.uniqueItems} items, ${getHierarchicalStats.totalQuantity} total quantity`)
      console.log(`- Leaf Items (Parts Only): ${getHierarchicalStats.leafItems} items, ${getHierarchicalStats.leafQuantity} total quantity`)
    }
  }

  const renderBOMItem = (item: EnhancedBOMItem, level: number = 0, index: number = 0) => {
    const childItems = item.children || item.subItems || item.components || []
    const hasChildren = childItems.length > 0
    const itemId = item.id || item.assemblyId || item.partNumber || `${item.name}-${index}`
    const isExpanded = expandedItems.has(itemId)
    
    // Separate display part number from internal itemId
    const getDisplayPartNumber = () => {
      // Debug: Log what we're working with
      if (item.name && index < 3) {
        console.log('🔍 BOMViewer item analysis:', {
          index,
          name: item.name,
          assemblyId: item.assemblyId,
          partNumber: item.partNumber,
          id: item.id,
          nameType: typeof item.name,
          assemblyIdType: typeof item.assemblyId
        })
      }
      
      // Priority: assemblyId -> partNumber -> id (if it looks like a real part number)
      // First try: only show if different from name (original logic)
      if (item.assemblyId && item.assemblyId !== item.name) return item.assemblyId
      if (item.partNumber && item.partNumber !== item.name) return item.partNumber
      if (item.id && item.id !== item.name && !item.id.includes(item.name || '')) return item.id
      
      // Fallback: show any valid part number even if it matches name (better than nothing)
      if (item.assemblyId && item.assemblyId.length < 50) return item.assemblyId
      if (item.partNumber && item.partNumber.length < 50) return item.partNumber
      if (item.id && item.id.length < 50) return item.id
      
      return null // No valid part number to display
    }
    const displayPartNumber = getDisplayPartNumber()
    
    // Enhanced type detection based on hierarchical expander data
    const isAssembly = item.isAssembly || item.type === 'ASSEMBLY' || item.type === 'COMPLEX' || 
                      item.type === 'KIT' || item.type === 'SUB_ASSEMBLY' || item.type === 'SIMPLE' ||
                      hasChildren
    const isPart = item.isPart || item.type === 'PART' || item.type === 'COMPONENT' || 
                  item.category === 'PART' || (!hasChildren && !isAssembly)
    const displayQuantity = item.aggregatedQuantity || item.quantity
    
    // Generate unique key using multiple identifiers to prevent duplicates
    const uniqueKey = `${itemId}-${level}-${index}-${item.name?.replace(/[^a-zA-Z0-9]/g, '')}-${displayQuantity}`

    // Determine the visual styling based on item type and level
    const getItemStyle = () => {
      if (level === 0) return 'bg-blue-50 border-l-4 border-blue-600 font-semibold'
      if (item.isAggregated) return 'bg-amber-50 border-l-4 border-amber-500'
      if (isAssembly && !isPart) return 'bg-gray-50 border-l-4 border-gray-400'
      return ''
    }

    // Determine icon color based on type
    const getIconColor = () => {
      if (level === 0) return 'text-blue-600'
      if (item.type === 'KIT') return 'text-purple-600'
      if (item.type === 'SUB_ASSEMBLY') return 'text-indigo-600'
      if (isAssembly) return 'text-blue-500'
      return 'text-gray-400'
    }

    // Get type badge color (commented out - type badges removed for cleaner display)
    // const getTypeBadgeVariant = () => {
    //   if (item.type === 'COMPLEX') return "default"
    //   if (item.type === 'KIT') return "secondary"
    //   if (item.type === 'SIMPLE') return "outline"
    //   if (isPart) return "secondary"
    //   return "default"
    // }

    return (
      <div key={uniqueKey}>
        <div 
          className={`flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-md transition-all duration-200 ${getItemStyle()}`}
          style={{ marginLeft: `${level * 20}px` }}
        >
          <div className="flex items-center space-x-2 flex-1">
            {hasChildren && (
              <button
                onClick={() => toggleItem(itemId)}
                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-5" />}
            
            {/* Icon based on item type */}
            {isAssembly ? (
              isExpanded ? (
                <FolderOpen className={`w-4 h-4 ${getIconColor()}`} />
              ) : (
                <Folder className={`w-4 h-4 ${getIconColor()}`} />
              )
            ) : (
              <FileIcon className="w-4 h-4 text-gray-400" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`${level === 0 ? "font-semibold text-gray-900" : level === 1 ? "font-medium text-gray-800" : "text-sm text-gray-700"} truncate`}>
                  {item.name}
                </span>
                {item.isCustom && (
                  <Badge variant="outline" className="text-xs shrink-0">Custom</Badge>
                )}
{/* Aggregated badge removed for cleaner display - logic preserved */}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                {displayPartNumber && (
                  <span className="font-mono truncate">{displayPartNumber}</span>
                )}
                {item.description && (
                  <span className="text-gray-400 truncate max-w-[300px]" title={item.description}>
                    • {item.description}
                  </span>
                )}
                {item.sourceInfo && item.sourceInfo.length > 0 && showDebugInfo && (
                  <Badge variant="outline" className="text-xs">
                    Sources: {item.sourceInfo.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0">
            {hasChildren && (
              <Badge variant="outline" className="text-xs">
                <Layers className="w-3 h-3 mr-1" />
                {childItems.length} {childItems.length === 1 ? 'component' : 'components'}
              </Badge>
            )}
{/* Type badge removed for cleaner display */}
            <span className="font-medium text-sm min-w-[80px] text-right bg-gray-100 px-2 py-1 rounded">
              Qty: {displayQuantity}
            </span>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 mt-1">
            <div className="border-l-2 border-gray-300 pl-2">
              {childItems.map((child, childIndex) => renderBOMItem(child, level + 1, childIndex))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            {orderData ? 'BOM Preview' : 'Bill of Materials'}
          </h3>
          <p className="text-sm text-gray-600">
            {poNumber ? `PO: ${poNumber}` : 'Preview Mode'} • Hierarchical Bill of Materials
            {showDebugInfo && (
              <span className="ml-2 text-xs text-blue-600">
                • {getLeafItemsCount()} parts only • {getLeafItemsQuantity()} parts quantity
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            disabled={exporting || !orderId}
            className="flex items-center gap-2"
            title={!orderId ? "PDF export is only available for saved orders" : "Export BOM as PDF"}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* BOM Items Display */}
      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Generating BOM preview...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              // Hierarchical Tree View
              <div className="space-y-1">
                {(!actualBomItems || actualBomItems.length === 0) ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No BOM items found for this order.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {showDebugInfo && (
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <div>Hierarchical view showing all component levels.</div>
                          <div>Click on folders to expand/collapse component details.</div>
                        </AlertDescription>
                      </Alert>
                    )}
                    {aggregatedBomItems.map((item, idx) => renderBOMItem(item, 0, idx))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}