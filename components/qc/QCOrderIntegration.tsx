"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Download,
  FileText,
  Play,
  Eye,
  Loader2,
  Package
} from "lucide-react"
import { format } from "date-fns"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { QCCertificateDocument } from "./QCCertificateDocument"

interface QCResult {
  id: string
  overallStatus: 'PASSED' | 'FAILED'
  qcPerformedById: string
  qcPerformedBy: {
    fullName: string
  }
  qcTimestamp?: string
  notes?: string
  qcFormTemplate: {
    name: string
    version: string
  }
  itemResults: Array<{
    id: string
    qcFormTemplateItem: {
      checklistItem: string
      itemType: string
      section: string
    }
    resultValue: string
    isConformant?: boolean
    notes?: string
    attachedDocument?: {
      id: string
      filename: string
      originalName: string
      size: number
      mimeType: string
    }
  }>
}

interface QCOrderIntegrationProps {
  orderId: string
  orderStatus: string
  orderDetails?: {
    poNumber?: string
    customerName?: string
    buildNumbers?: string[]
    productType?: string
    jobId?: string
    sinkDimensions?: {
      length?: number
      width?: number
      depth?: number
    }
  }
}

export function QCOrderIntegration({ orderId, orderStatus, orderDetails }: QCOrderIntegrationProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [qcResults, setQcResults] = useState<QCResult[]>([])
  const [loading, setLoading] = useState(true)
  const [hasQCTemplate, setHasQCTemplate] = useState(false)

  useEffect(() => {
    fetchQCData()
  }, [orderId])

  const fetchQCData = async () => {
    try {
      setLoading(true)
      
      // Check for QC results
      const resultsResponse = await nextJsApiClient.get(`/orders/${orderId}/qc`)
      if (resultsResponse.data.success) {
        setQcResults(resultsResponse.data.qcResults || [])
      }

      // Check if QC template exists for this order
      try {
        const templateResponse = await nextJsApiClient.get(`/orders/${orderId}/qc/template`)
        setHasQCTemplate(templateResponse.data.success && templateResponse.data.template)
      } catch (error) {
        setHasQCTemplate(false)
      }
    } catch (error: any) {
      console.error('Error fetching QC data:', error)
      toast({
        title: "Error",
        description: "Failed to load QC data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartQC = () => {
    router.push(`/orders/${orderId}/qc`)
  }

  const handleExportQC = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}/qc/export`, {
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `qc_results_${orderId}_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: "QC results exported successfully"
      })
    } catch (error: any) {
      console.error('Error exporting QC results:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export QC results",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-100 text-green-700'
      case 'FAILED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return CheckCircle
      case 'FAILED':
        return XCircle
      default:
        return AlertTriangle
    }
  }

  const shouldShowQCActions = () => {
    const qcReadyStatuses = ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC']
    return qcReadyStatuses.includes(orderStatus) && hasQCTemplate
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* QC Actions */}
      {shouldShowQCActions() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              QC Actions
            </CardTitle>
            <CardDescription>
              This order is ready for quality control inspection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button onClick={handleStartQC} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Start QC Inspection
              </Button>
              <Badge className={getStatusColor('PENDING')}>
                {orderStatus === 'READY_FOR_PRE_QC' ? 'Pre-QC Required' : 'Final QC Required'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QC Results History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>QC Inspection Results</CardTitle>
              <CardDescription>
                {qcResults.length > 0 
                  ? `${qcResults.length} inspection${qcResults.length > 1 ? 's' : ''} completed`
                  : 'No QC inspections completed yet'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {qcResults.length > 0 ? (
            <div className="space-y-6">
              {qcResults.map((result) => (
                <QCCertificateDocument 
                  key={result.id}
                  qcResult={result}
                  orderId={orderId}
                  orderDetails={orderDetails}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              {hasQCTemplate ? (
                <>
                  <ClipboardCheck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No QC inspections have been completed for this order</p>
                  {shouldShowQCActions() && (
                    <Button onClick={handleStartQC} className="flex items-center gap-2 mx-auto">
                      <Play className="w-4 h-4" />
                      Start First QC Inspection
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No QC template configured for this product type</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Contact your administrator to set up quality control templates
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}