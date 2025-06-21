"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertCircle,
  Loader2,
  Package
} from "lucide-react"
import { BOMViewer } from "../BOMViewer"

export interface BOMData {
  bom?: {
    hierarchical?: any[]
    flattened?: any[]
    totalItems?: number
  }
  buildBOMs?: Record<string, any>
  isMultiBuild?: boolean
  totalItems?: number
}

export interface CustomerInfo {
  poNumber: string
  customerName: string
  salesPerson: string
  projectName?: string
  wantDate: Date | string | null
  poDocuments?: File[]
  sinkDrawings?: File[]
  notes?: string
}

export interface SinkSelection {
  sinkModelId: string
  quantity: number
  buildNumbers: string[]
}

export interface BOMDisplayProps {
  bomData?: BOMData | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  customerInfo: CustomerInfo
  sinkSelection: SinkSelection
  configurations: Record<string, any>
  accessories: Record<string, any>
  showDebugInfo?: boolean
}

export function BOMDisplay({ 
  bomData, 
  isLoading = false, 
  error = null, 
  onRetry,
  customerInfo,
  sinkSelection,
  configurations,
  accessories,
  showDebugInfo = false
}: BOMDisplayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Generating BOM preview...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Retry BOM Preview
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!bomData || (!bomData.bom && !bomData.buildBOMs)) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No BOM data available</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="mt-2">
              Generate BOM Preview
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Multi-Build Display
  if (bomData.isMultiBuild && bomData.buildBOMs) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Bill of Materials by Build</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {Object.keys(bomData.buildBOMs).length} Build{Object.keys(bomData.buildBOMs).length !== 1 ? 's' : ''}
            </Badge>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                Refresh
              </Button>
            )}
          </div>
        </div>
        
        {Object.entries(bomData.buildBOMs).map(([buildNumber, buildBOM]: [string, any]) => (
          <Card key={buildNumber} className="overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-700">{buildNumber}</Badge>
                  <span className="text-base">Bill of Materials</span>
                </CardTitle>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">{buildBOM?.totalItems || 0}</span> items
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <BOMViewer
                bomItems={buildBOM?.hierarchical || buildBOM?.flattened || []}
                orderData={{
                  customerInfo,
                  sinkSelection: { ...sinkSelection, buildNumbers: [buildNumber] },
                  configurations: { [buildNumber]: configurations[buildNumber] },
                  accessories: { [buildNumber]: accessories[buildNumber] || [] }
                }}
                customerInfo={customerInfo}
                showDebugInfo={showDebugInfo}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Single Build Display
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Bill of Materials</h3>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              Refresh
            </Button>
          )}
        </div>
      </div>
      
      <BOMViewer
        bomItems={bomData.bom?.hierarchical || bomData.bom?.flattened || []}
        orderData={{
          customerInfo,
          sinkSelection,
          configurations,
          accessories
        }}
        customerInfo={customerInfo}
        showDebugInfo={showDebugInfo}
      />
    </div>
  )
}