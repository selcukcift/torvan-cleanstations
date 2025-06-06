"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  ChevronDown, 
  ChevronRight, 
  Download,
  Printer,
  Share2,
  FileText,
  Filter,
  Search,
  TreePine,
  List,
  Eye,
  Package,
  CheckCircle,
  AlertCircle,
  Building2,
  Calendar,
  User,
  Hash,
  DollarSign,
  Layers
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface BOMViewerProps {
  orderData: any
  customerInfo: any
  className?: string
}

interface BOMItem {
  assemblyId: string
  name: string
  description?: string
  quantity: number
  category?: string
  subItems?: BOMItem[]
  price?: number
  unitPrice?: number
  partNumber?: string
  id?: string
  level?: number
  indentLevel?: number
  isChild?: boolean
  isPart?: boolean
  hasChildren?: boolean
  children?: BOMItem[]
  type?: string
}

interface BOMData {
  items: BOMItem[]
  totalItems: number
  isComplete: boolean
  missingRequiredFields: string[]
  hierarchical?: BOMItem[]
  topLevelItems?: number
  totalPrice?: number
}

export function BOMViewer({ orderData, customerInfo, className }: BOMViewerProps) {
  const [bomData, setBomData] = useState<BOMData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']))
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'hierarchical' | 'categorized' | 'flat'>('hierarchical')
  const [showPrices, setShowPrices] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'category'>('category')
  const printRef = useRef<HTMLDivElement>(null)

  const generateBOM = useCallback(async () => {
    if (!orderData || Object.keys(orderData).length === 0) {
      setBomData(null)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Create comprehensive BOM data structure based on the debug helper logic
      const configurations: Record<string, any> = {}
      
      // Process all sink configurations
      Object.entries(orderData).forEach(([buildNumber, config]: [string, any]) => {
        const configData: any = {
          sinkModelId: config.sinkModelId
        }

        // Add all configuration fields
        if (config.width) configData.width = config.width
        if (config.length) configData.length = config.length
        if (config.legsTypeId) configData.legsTypeId = config.legsTypeId
        if (config.feetTypeId) configData.feetTypeId = config.feetTypeId
        if (config.pegboard) {
          configData.pegboard = config.pegboard
          if (config.pegboardTypeId) configData.pegboardTypeId = config.pegboardTypeId
          // Pegboard size is now auto-calculated based on sink length
          if (config.pegboardColorId) configData.pegboardColorId = config.pegboardColorId
        }
        if (config.workflowDirection) configData.workflowDirection = config.workflowDirection

        // Process basins with custom dimension support
        if (config.basins && config.basins.length > 0) {
          configData.basins = config.basins.map((basin: any) => {
            const basinData: any = {}
            
            // Map basin type
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
                default:
                  if (!basinTypeValue.startsWith('T2-BSN-')) {
                    console.warn(`Unknown basin type: ${basinTypeValue}`)
                  }
                  kitAssemblyId = basinTypeValue
              }
              basinData.basinTypeId = kitAssemblyId
            }
            
            // Handle custom basin dimensions
            if (basin.basinSizePartNumber === 'CUSTOM' && basin.customWidth && basin.customLength && basin.customDepth) {
              const customDimensions = `${basin.customWidth}X${basin.customLength}X${basin.customDepth}`
              basinData.basinSizePartNumber = `720.215.001`
              basinData.customPartNumber = `T2-ADW-BASIN-${customDimensions}`
              basinData.customDimensions = customDimensions
            } else if (basin.basinSizePartNumber || basin.basinSize) {
              let sizePartNumber = basin.basinSizePartNumber
              
              if (basin.basinSize && !sizePartNumber) {
                const sizeMappings: Record<string, string> = {
                  '20X20X8': 'T2-ADW-BASIN20X20X8',
                  '24X20X8': 'T2-ADW-BASIN24X20X8', 
                  '24X20X10': 'T2-ADW-BASIN24X20X10',
                  '30X20X8': 'T2-ADW-BASIN30X20X8',
                  '30X20X10': 'T2-ADW-BASIN30X20X10'
                }
                sizePartNumber = sizeMappings[basin.basinSize] || basin.basinSize
              }
              
              if (sizePartNumber) {
                basinData.basinSizePartNumber = sizePartNumber
              }
            }
            
            if (basin.addonIds && basin.addonIds.length > 0) basinData.addonIds = basin.addonIds
            return basinData
          }).filter((basin: any) => basin.basinTypeId || basin.basinSizePartNumber || (basin.addonIds && basin.addonIds.length > 0))
        }

        // Add faucets
        if (config.faucets && config.faucets.length > 0) {
          configData.faucets = config.faucets.map((faucet: any) => ({
            faucetTypeId: faucet.faucetTypeId || faucet.faucetType,
            quantity: faucet.quantity || 1,
            placement: faucet.placement
          })).filter((faucet: any) => faucet.faucetTypeId)
        }

        // Add sprayers
        if (config.sprayers && config.sprayers.length > 0) {
          configData.sprayers = config.sprayers.map((sprayer: any) => ({
            id: sprayer.id,
            sprayerTypeId: sprayer.sprayerTypeId || sprayer.sprayerType,
            location: sprayer.location
          })).filter((sprayer: any) => sprayer.sprayerTypeId)
        }

        if (config.controlBoxId) configData.controlBoxId = config.controlBoxId

        configurations[buildNumber] = configData
      })

      // Create BOM preview data
      const buildNumbers = Object.keys(configurations)
      const previewData = {
        customerInfo: {
          poNumber: customerInfo?.poNumber || "BOM-PREVIEW",
          customerName: customerInfo?.customerName || "Preview Customer",
          salesPerson: customerInfo?.salesPerson || "Sales Rep",
          wantDate: customerInfo?.wantDate ? new Date(customerInfo.wantDate).toISOString() : new Date().toISOString(),
          language: customerInfo?.language || "EN"
        },
        sinkSelection: {
          sinkModelId: configurations[buildNumbers[0]]?.sinkModelId || '',
          quantity: buildNumbers.length,
          buildNumbers: buildNumbers
        },
        configurations: configurations,
        accessories: {} // Add accessories if available
      }

      console.log('Generating BOM with data:', JSON.stringify(previewData, null, 2))
      
      const axiosResponse = await nextJsApiClient.post('/orders/preview-bom', previewData)
      const response = axiosResponse.data

      if (!response) {
        setError('No response received from BOM API')
        return
      }

      if (response.success) {
        const bomResult = response.data.bom || response.data
        const items = bomResult.flattened || []
        const hierarchicalItems = bomResult.hierarchical || []
        
        // Calculate total price if prices are available
        const totalPrice = items.reduce((sum: number, item: BOMItem) => {
          const itemPrice = item.price || (item.unitPrice && item.quantity ? item.unitPrice * item.quantity : 0)
          return sum + itemPrice
        }, 0)

        setBomData({
          items: items,
          hierarchical: hierarchicalItems,
          totalItems: bomResult.totalItems || items.length,
          topLevelItems: bomResult.topLevelItems || hierarchicalItems.length,
          isComplete: true,
          missingRequiredFields: [],
          totalPrice: totalPrice > 0 ? totalPrice : undefined
        })
      } else {
        setError(response.message || 'Failed to generate BOM')
      }

    } catch (error) {
      console.error('Error generating BOM:', error)
      setError('Failed to generate BOM. Please check your configuration.')
    } finally {
      setLoading(false)
    }
  }, [orderData, customerInfo])

  useEffect(() => {
    generateBOM()
  }, [generateBOM])

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Bill of Materials - ${customerInfo?.poNumber || 'BOM'}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .bom-item { margin: 5px 0; padding: 5px; border-left: 3px solid #ddd; }
                .bom-item.level-0 { border-left-color: #333; font-weight: bold; }
                .bom-item.level-1 { margin-left: 20px; border-left-color: #666; }
                .bom-item.level-2 { margin-left: 40px; border-left-color: #999; }
                .quantity { font-weight: bold; color: #0066cc; }
                .part-number { font-family: monospace; color: #666; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }
    }
  }

  const handleExportPDF = async () => {
    // This would integrate with a PDF generation library like jsPDF or use a server endpoint
    alert('PDF export functionality would be implemented here')
  }

  const handleShare = async () => {
    const shareData = {
      title: `BOM - ${customerInfo?.poNumber || 'Order'}`,
      text: `Bill of Materials for ${customerInfo?.customerName || 'Customer'}`,
      url: window.location.href
    }

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const filteredItems = bomData?.items?.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.assemblyId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory
    
    return matchesSearch && matchesCategory
  }) || []

  const categories = Array.from(new Set(bomData?.items?.map(item => item.category).filter(Boolean))) || []

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      case 'quantity':
        return (b.quantity || 0) - (a.quantity || 0)
      case 'category':
        return (a.category || '').localeCompare(b.category || '')
      default:
        return 0
    }
  })

  const renderBOMItem = (item: BOMItem, level: number = 0) => {
    const isExpanded = expandedCategories.has(item.category || 'unknown')
    
    return (
      <div key={`${item.id}-${level}`} className={`bom-item level-${level}`}>
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
          <div className="flex items-center space-x-3" style={{ marginLeft: `${level * 20}px` }}>
            {item.hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newExpanded = new Set(expandedCategories)
                  if (isExpanded) {
                    newExpanded.delete(item.category || 'unknown')
                  } else {
                    newExpanded.add(item.category || 'unknown')
                  }
                  setExpandedCategories(newExpanded)
                }}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
            
            <Package className="w-4 h-4 text-slate-500" />
            
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-slate-500">
                <span className="part-number">{item.partNumber || item.assemblyId}</span>
                {item.category && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="quantity font-semibold">Qty: {item.quantity}</div>
              {showPrices && item.unitPrice && (
                <div className="text-sm text-slate-500">
                  ${item.unitPrice.toFixed(2)} each
                </div>
              )}
            </div>
          </div>
        </div>
        
        {item.children && isExpanded && (
          <div className="ml-4 mt-2 space-y-1">
            {item.children.map(child => renderBOMItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Generating Bill of Materials...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={generateBOM} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Bill of Materials</span>
            </CardTitle>
            <CardDescription>
              Complete component listing for order {customerInfo?.poNumber || 'Preview'}
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Order Information Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg mb-6">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-slate-500" />
            <div>
              <div className="text-sm font-medium">PO Number</div>
              <div className="text-sm text-slate-600">{customerInfo?.poNumber || 'N/A'}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <div>
              <div className="text-sm font-medium">Customer</div>
              <div className="text-sm text-slate-600">{customerInfo?.customerName || 'N/A'}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-slate-500" />
            <div>
              <div className="text-sm font-medium">Sales Person</div>
              <div className="text-sm text-slate-600">{customerInfo?.salesPerson || 'N/A'}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div>
              <div className="text-sm font-medium">Delivery Date</div>
              <div className="text-sm text-slate-600">
                {customerInfo?.wantDate ? new Date(customerInfo.wantDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: 'name' | 'quantity' | 'category') => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="quantity">Quantity</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(value: 'hierarchical' | 'categorized' | 'flat') => setViewMode(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="View mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hierarchical">
                <TreePine className="w-4 h-4 mr-2 inline" />
                Hierarchical
              </SelectItem>
              <SelectItem value="flat">
                <List className="w-4 h-4 mr-2 inline" />
                Flat List
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{bomData?.totalItems || 0}</div>
            <div className="text-sm text-blue-800">Total Items</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{bomData?.topLevelItems || 0}</div>
            <div className="text-sm text-green-800">Assemblies</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
            <div className="text-sm text-purple-800">Categories</div>
          </div>
          {bomData?.totalPrice && (
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">${bomData.totalPrice.toFixed(2)}</div>
              <div className="text-sm text-amber-800">Total Value</div>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* BOM Content */}
        <div ref={printRef}>
          {/* Print Header */}
          <div className="hidden print:block mb-6">
            <div className="header">
              <h1 className="text-2xl font-bold">Bill of Materials</h1>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <strong>PO Number:</strong> {customerInfo?.poNumber || 'N/A'}<br/>
                  <strong>Customer:</strong> {customerInfo?.customerName || 'N/A'}
                </div>
                <div>
                  <strong>Sales Person:</strong> {customerInfo?.salesPerson || 'N/A'}<br/>
                  <strong>Date:</strong> {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {viewMode === 'hierarchical' && bomData?.hierarchical ? (
                bomData.hierarchical.map(item => renderBOMItem(item, 0))
              ) : (
                sortedItems.map((item, index) => renderBOMItem(item, item.indentLevel || 0))
              )}
            </div>
          </ScrollArea>
        </div>

        {sortedItems.length === 0 && bomData?.items && bomData.items.length > 0 && (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">No items match your current filters</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setFilterCategory('all')
              }}
              className="mt-2"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}