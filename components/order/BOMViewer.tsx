"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Download, 
  FileText, 
  Package, 
  ChevronRight,
  ChevronDown,
  Loader2,
  Info,
  Search,
  Filter,
  FolderOpen,
  Folder,
  FileIcon,
  Layers,
  List,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface BOMItem {
  id: string
  partIdOrAssemblyId: string
  name: string
  quantity: number
  itemType: string
  category?: string
  isCustom?: boolean
  parentId?: string
  children?: BOMItem[]
  assemblyId?: string
  partNumber?: string
  level?: number
  indentLevel?: number
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
  onExport?: (format: 'csv' | 'pdf') => void
  showDebugInfo?: boolean
}

export function BOMViewer({ orderId, poNumber, bomItems, orderData, customerInfo, onExport, showDebugInfo = false }: BOMViewerProps) {
  const { toast } = useToast()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("ALL")
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'category' | 'flat'>('tree')
  const [showCustomOnly, setShowCustomOnly] = useState(false)
  
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

  // Generate BOM preview when orderData is provided (similar to BOMDebugHelper)
  const generateBOMPreview = useCallback(async (retryCount = 0) => {
    if (!orderData) return

    setLoading(true)
    setError(null)
    
    try {
      // Convert orderData to the format expected by the BOM preview API
      const previewData = {
        customerInfo: customerInfo || {
          poNumber: "PREVIEW",
          customerName: "Preview Customer", 
          salesPerson: "Preview User",
          wantDate: new Date().toISOString(),
          language: "EN"
        },
        sinkSelection: {
          sinkModelId: orderData.sinkModelId || "T2-36",
          quantity: 1,
          buildNumbers: ["PREVIEW-001"]
        },
        configurations: {
          "PREVIEW-001": orderData
        },
        accessories: {}
      }

      const response = await nextJsApiClient.post('/orders/preview-bom', previewData)
      
      if (response.data.success) {
        const bomResult = response.data.data.bom || response.data.data
        const items = bomResult.flattened || bomResult.hierarchical || []
        setPreviewBomItems(items)
      } else {
        setError(response.data.error || 'Failed to generate BOM preview')
      }
    } catch (err: any) {
      console.error('BOM preview error:', err)
      
      // Handle rate limiting with exponential backoff
      if (err.response?.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
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
      if (retryCount === 0) { // Only set loading false on initial attempt
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

  // Determine which items to use - either provided bomItems or generated previewBomItems
  const actualBomItems = bomItems || previewBomItems

  // Quantity aggregation with enhanced deduplication
  const processedItems = useMemo(() => {
    if (!actualBomItems || actualBomItems.length === 0) return []

    const quantityMap = new Map<string, EnhancedBOMItem>()
    
    const processItem = (item: BOMItem, level: number = 0) => {
      const key = item.partIdOrAssemblyId || item.assemblyId || item.id
      
      if (quantityMap.has(key)) {
        const existing = quantityMap.get(key)!
        existing.aggregatedQuantity = (existing.aggregatedQuantity || existing.quantity) + item.quantity
        existing.isAggregated = true
        if (!existing.sourceInfo) existing.sourceInfo = []
        existing.sourceInfo.push(item.sourceContext || `Level ${level}`)
      } else {
        quantityMap.set(key, {
          ...item,
          aggregatedQuantity: item.quantity,
          isAggregated: false,
          sourceInfo: item.sourceContext ? [item.sourceContext] : [],
          level
        })
      }

      if (item.children) {
        item.children.forEach(child => processItem(child, level + 1))
      }
    }

    actualBomItems.forEach(item => processItem(item))
    return Array.from(quantityMap.values())
  }, [actualBomItems])

  // Enhanced filtering and grouping
  const { filteredItems, groupedItems, categories } = useMemo(() => {
    let filtered = processedItems

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.partIdOrAssemblyId?.toLowerCase().includes(searchLower)) ||
        (item.assemblyId?.toLowerCase().includes(searchLower))
      )
    }

    // Apply custom items filter
    if (showCustomOnly) {
      filtered = filtered.filter(item => item.isCustom)
    }

    // Group by category
    const grouped = filtered.reduce((acc: Record<string, EnhancedBOMItem[]>, item) => {
      const category = item.category || 'MISCELLANEOUS'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})

    // Apply category filter
    const finalGrouped = filterCategory !== 'ALL' 
      ? { [filterCategory]: grouped[filterCategory] || [] }
      : grouped

    const cats = ['ALL', ...Object.keys(grouped)]

    return {
      filteredItems: filtered,
      groupedItems: finalGrouped,
      categories: cats
    }
  }, [processedItems, searchTerm, filterCategory, showCustomOnly])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

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
    setExpandedCategories(new Set(Object.keys(groupedItems)))
  }

  const collapseAll = () => {
    setExpandedItems(new Set())
    setExpandedCategories(new Set())
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (onExport) {
      onExport(format)
      return
    }

    try {
      setExporting(format)
      const response = await nextJsApiClient.get(
        `/orders/${orderId}/bom/export?format=${format}`,
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
      let filename = `bom_${poNumber}_${new Date().toISOString().split('T')[0]}.${format}`
      
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
        description: `BOM exported as ${format.toUpperCase()} successfully`
      })
    } catch (error: any) {
      console.error('BOM export error:', error)
      toast({
        title: "Export Failed",
        description: error.response?.data?.error || `Failed to export BOM as ${format.toUpperCase()}`,
        variant: "destructive"
      })
    } finally {
      setExporting(null)
    }
  }

  const getTotalQuantity = () => {
    return processedItems.reduce((sum, item) => sum + (item.aggregatedQuantity || item.quantity), 0)
  }

  const getUniqueItems = () => {
    return processedItems.length
  }

  const renderBOMItem = (item: EnhancedBOMItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const isAssembly = item.itemType === 'ASSEMBLY' || item.itemType === 'COMPLEX_ASSEMBLY' || hasChildren
    const displayQuantity = item.aggregatedQuantity || item.quantity

    return (
      <div key={`${item.id || item.assemblyId || item.partIdOrAssemblyId}-${level}`}>
        <div 
          className={`flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-md transition-colors ${
            level === 0 ? 'bg-gray-50 border-l-4 border-blue-500' : ''
          } ${item.isAggregated ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}
          style={{ marginLeft: `${level * 16}px` }}
        >
          <div className="flex items-center space-x-2 flex-1">
            {hasChildren && (
              <button
                onClick={() => toggleItem(item.id)}
                className="p-0.5 hover:bg-gray-200 rounded"
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
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500" />
              )
            ) : (
              <FileIcon className="w-4 h-4 text-gray-400" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`${level === 0 ? "font-semibold text-blue-700" : "text-sm"} ${
                  hasChildren ? "text-blue-700" : "text-gray-700"
                } truncate`}>
                  {item.name}
                </span>
                {item.isCustom && (
                  <Badge variant="outline" className="text-xs shrink-0">Custom</Badge>
                )}
                {item.isAggregated && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {displayQuantity}pcs
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="truncate">{item.partIdOrAssemblyId || item.assemblyId}</span>
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
              <Badge variant="secondary" className="text-xs">
                {item.children!.length} items
              </Badge>
            )}
            <Badge variant={isAssembly ? "default" : "secondary"} className="text-xs">
              {item.itemType.replace(/_/g, ' ')}
            </Badge>
            <span className="font-medium text-sm min-w-[60px] text-right">
              Qty: {displayQuantity}
            </span>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l-2 border-gray-200 pl-2">
            {item.children!.map(child => renderBOMItem(child, level + 1))}
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
            {poNumber ? `PO: ${poNumber}` : 'Preview Mode'} • {getUniqueItems()} unique items • {getTotalQuantity()} total quantity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('csv')}
            variant="outline"
            size="sm"
            disabled={exporting === 'csv'}
            className="flex items-center gap-2"
          >
            {exporting === 'csv' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export CSV
          </Button>
          {showDebugInfo && (
            <Button
              onClick={() => setShowCustomOnly(!showCustomOnly)}
              variant={showCustomOnly ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showCustomOnly ? "Show All" : "Custom Only"}
            </Button>
          )}
        </div>
      </div>

      {/* Compact Controls */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>
        <div className="sm:w-40">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'ALL' ? 'All Categories' : category.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tree')}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'category' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('category')}
          >
            <Package className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'flat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('flat')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
        {viewMode === 'tree' && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse
            </Button>
          </div>
        )}
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
            ) : viewMode === 'tree' ? (
              // Tree View
              <div className="space-y-1">
                {(!actualBomItems || actualBomItems.length === 0) ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No BOM items found for this order.
                    </AlertDescription>
                  </Alert>
                ) : (
                  actualBomItems
                    .filter(item => {
                      if (!searchTerm) return true
                      const searchLower = searchTerm.toLowerCase()
                      return (
                        item.name?.toLowerCase().includes(searchLower) ||
                        (item.partIdOrAssemblyId?.toLowerCase().includes(searchLower))
                      )
                    })
                    .map(item => renderBOMItem(item))
                )}
              </div>
            ) : viewMode === 'flat' ? (
              // Flat View - Processed items with aggregation
              <div className="space-y-1">
                {filteredItems.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No items found matching your criteria.
                    </AlertDescription>
                  </Alert>
                ) : (
                  filteredItems.map(item => renderBOMItem(item, 0))
                )}
              </div>
            ) : (
              // Category View
              Object.keys(groupedItems).length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No items found matching your search criteria.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight 
                            className={`w-4 h-4 transition-transform ${
                              expandedCategories.has(category) ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="font-medium">{category.replace(/_/g, ' ')}</span>
                          <Badge variant="secondary" className="ml-2">
                            {items.length} items
                          </Badge>
                        </div>
                        <span className="text-sm text-slate-600">
                          Total Qty: {items.reduce((sum, item) => sum + (item.aggregatedQuantity || item.quantity), 0)}
                        </span>
                      </button>
                      
                      {expandedCategories.has(category) && (
                        <div className="p-2 space-y-1">
                          {items.map(item => renderBOMItem(item, 0))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}