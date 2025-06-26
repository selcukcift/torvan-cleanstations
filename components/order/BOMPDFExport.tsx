'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Layers, 
  List,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import BOMExportService from '@/lib/bomExportService'

interface BOMPDFExportProps {
  orderId?: string
  bomData?: any
  orderInfo?: any
  customerInfo?: any
  className?: string
  disabled?: boolean
}

export default function BOMPDFExport({ 
  orderId, 
  bomData, 
  orderInfo, 
  customerInfo,
  className = '',
  disabled = false 
}: BOMPDFExportProps) {
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async (format: 'hierarchical' | 'aggregated', method: 'api' | 'client' = 'api') => {
    if (exporting) return
    
    setExporting(true)
    
    try {
      if (method === 'api' && orderId) {
        // Server-side PDF generation via API
        await exportViaAPI(format)
      } else if (method === 'client' && bomData) {
        // Client-side PDF generation
        await exportViaClient(format)
      } else {
        throw new Error('Missing required data for export')
      }
      
      toast({
        title: "Export Successful",
        description: `BOM PDF (${format}) has been downloaded successfully.`,
        variant: "default"
      })
      
    } catch (error: any) {
      console.error('PDF Export Error:', error)
      
      let errorMessage = 'Failed to export BOM PDF'
      if (error.message?.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
      } else if (error.message?.includes('permission')) {
        errorMessage = "You don't have permission to export this order's BOM."
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
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

  const exportViaAPI = async (format: 'hierarchical' | 'aggregated') => {
    if (!orderId) {
      throw new Error('Order ID is required for API export')
    }
    
    const filename = `BOM_${orderId}_${format}_${new Date().toISOString().split('T')[0]}.pdf`
    
    // Make API request
    const response = await fetch(`/api/orders/${orderId}/bom-export-pdf?format=${format}&filename=${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Export failed with status ${response.status}`)
    }
    
    // Download the PDF
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  const exportViaClient = async (format: 'hierarchical' | 'aggregated') => {
    if (!bomData?.hierarchical || !Array.isArray(bomData.hierarchical)) {
      throw new Error('No BOM data available for export')
    }
    
    // Prepare order info
    const exportOrderInfo = {
      orderId: orderId || 'PREVIEW',
      customerName: customerInfo?.name || orderInfo?.customer?.name || 'Unknown Customer',
      orderDate: orderInfo?.createdAt || new Date().toISOString().split('T')[0],
      buildNumbers: orderInfo?.buildNumbers || ['Unknown'],
      projectName: `CleanStation BOM - ${format}`
    }
    
    // Convert BOM to export format
    const exportData = BOMExportService.flattenBOMForExport(
      bomData.hierarchical,
      exportOrderInfo
    )
    
    // Generate aggregated version if requested
    const finalExportData = format === 'aggregated' 
      ? BOMExportService.generateAggregatedBOM(exportData)
      : exportData
    
    // Generate PDF
    const pdfBuffer = await BOMExportService.generatePDF(finalExportData)
    
    // Download PDF
    const filename = `BOM_${orderId || 'preview'}_${format}_${new Date().toISOString().split('T')[0]}.pdf`
    BOMExportService.downloadPDF(pdfBuffer, filename)
  }

  const canExport = (orderId && !disabled) || (bomData?.hierarchical && Array.isArray(bomData.hierarchical) && bomData.hierarchical.length > 0)

  if (!canExport) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={true}
        className={`flex items-center gap-2 ${className}`}
      >
        <AlertCircle className="w-4 h-4" />
        No Data
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          className={`flex items-center gap-2 ${className}`}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {exporting ? 'Exporting...' : 'Export PDF'}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">
          PDF Export Options
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => handleExport('hierarchical', orderId ? 'api' : 'client')}
          disabled={exporting}
          className="flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          <div className="flex flex-col">
            <span className="font-medium">Hierarchical BOM</span>
            <span className="text-xs text-gray-500">
              Shows all parent-child relationships with indentation
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => handleExport('aggregated', orderId ? 'api' : 'client')}
          disabled={exporting}
          className="flex items-center gap-2"
        >
          <List className="w-4 h-4" />
          <div className="flex flex-col">
            <span className="font-medium">Aggregated BOM</span>
            <span className="text-xs text-gray-500">
              Combines identical items with total quantities
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem disabled className="text-xs text-gray-400">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel Export (Coming Soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Export type definitions for use in other components
export type { BOMPDFExportProps }