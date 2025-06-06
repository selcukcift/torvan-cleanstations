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

interface QCResult {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  inspectorId: string
  inspector: {
    fullName: string
  }
  completedAt?: string
  notes?: string
  template: {
    name: string
    version: string
  }
  qcItems: Array<{
    id: string
    templateItem: {
      text: string
      itemType: string
      category: string
    }
    value: string
    passed?: boolean
    notes?: string
  }>
}

interface QCOrderIntegrationProps {
  orderId: string
  orderStatus: string
}

export function QCOrderIntegration({ orderId, orderStatus }: QCOrderIntegrationProps) {
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
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700'
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'FAILED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircle
      case 'FAILED':
        return XCircle
      case 'IN_PROGRESS':
        return ClipboardCheck
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
            {qcResults.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportQC}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {qcResults.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {qcResults.map((result) => {
                  const StatusIcon = getStatusIcon(result.status)
                  
                  return (
                    <Card key={result.id} className="border-l-4 border-l-blue-400">
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`w-5 h-5 ${
                                  result.status === 'COMPLETED' ? 'text-green-500' :
                                  result.status === 'FAILED' ? 'text-red-500' :
                                  result.status === 'IN_PROGRESS' ? 'text-blue-500' : 'text-yellow-500'
                                }`} />
                                <h4 className="font-medium">{result.template.name}</h4>
                                <Badge className={getStatusColor(result.status)}>
                                  {result.status}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Inspector: {result.inspector.fullName}
                                </div>
                                {result.completedAt && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Completed: {format(new Date(result.completedAt), "MMM dd, yyyy 'at' HH:mm")}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Version: {result.template.version}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Inspector Notes */}
                          {result.notes && (
                            <div className="bg-slate-50 rounded-md p-3">
                              <h5 className="font-medium text-sm mb-1">Inspector Notes</h5>
                              <p className="text-sm text-slate-700">{result.notes}</p>
                            </div>
                          )}

                          {/* QC Items Summary */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-sm">Inspection Items</h5>
                            
                            {/* Group items by category */}
                            {Object.entries(
                              result.qcItems.reduce((acc, item) => {
                                const category = item.templateItem.category || 'General'
                                if (!acc[category]) acc[category] = []
                                acc[category].push(item)
                                return acc
                              }, {} as Record<string, typeof result.qcItems>)
                            ).map(([category, items]) => (
                              <div key={category} className="space-y-2">
                                <h6 className="text-sm font-medium text-slate-700">{category}</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                                  {items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                      <span className="text-slate-600 truncate flex-1">
                                        {item.templateItem.text}
                                      </span>
                                      <div className="flex items-center gap-2 ml-2">
                                        {item.templateItem.itemType === 'PASS_FAIL' ? (
                                          item.passed ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                              Pass
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                                              Fail
                                            </Badge>
                                          )
                                        ) : (
                                          <span className="text-xs text-slate-500 max-w-20 truncate">
                                            {item.value || 'N/A'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Item Notes */}
                          {result.qcItems.some(item => item.notes) && (
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm">Additional Notes</h5>
                              <div className="space-y-2 ml-4">
                                {result.qcItems
                                  .filter(item => item.notes)
                                  .map((item) => (
                                    <div key={item.id} className="text-sm">
                                      <span className="font-medium text-slate-700">
                                        {item.templateItem.text}:
                                      </span>
                                      <span className="text-slate-600 ml-2">{item.notes}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
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