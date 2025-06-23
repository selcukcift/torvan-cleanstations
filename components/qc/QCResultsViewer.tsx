"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Package,
  User,
  Calendar,
  FileText,
  ArrowLeft,
  Download
} from "lucide-react"
import { format } from "date-fns"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface QCResultItem {
  id: string
  qcFormTemplateItemId: string
  resultValue: string
  isConformant: boolean
  notes: string
  isNotApplicable: boolean
  qcFormTemplateItem: {
    checklistItem: string
    section: string
    itemType: string
    isRequired: boolean
  }
}

interface QCResult {
  id: string
  overallStatus: 'PASSED' | 'FAILED'
  notes: string
  qcTimestamp: string
  qcPerformedBy: {
    fullName: string
    role: string
  }
  qcFormTemplate: {
    name: string
    description: string
  }
  itemResults: QCResultItem[]
}

interface QCResultsViewerProps {
  orderId: string
  orderData?: {
    poNumber: string
    customerName: string
    buildNumbers: string[]
    status?: string
  }
}

export function QCResultsViewer({ orderId, orderData }: QCResultsViewerProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [qcResults, setQcResults] = useState<QCResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQCResults()
  }, [orderId])

  const fetchQCResults = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/orders/${orderId}/qc`)
      
      if (response.data.success) {
        setQcResults(response.data.qcResults || [])
      } else {
        throw new Error(response.data.error || 'Failed to fetch QC results')
      }
    } catch (error: any) {
      console.error('Error fetching QC results:', error)
      toast({
        title: "Error",
        description: "Failed to load QC results",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }

  const getStatusIcon = (status: string) => {
    return status === 'PASSED' ? CheckCircle2 : XCircle
  }

  const renderResultValue = (item: QCResultItem) => {
    if (item.isNotApplicable) {
      return <Badge variant="secondary">N/A</Badge>
    }

    switch (item.qcFormTemplateItem.itemType) {
      case 'CHECKBOX':
        return item.isConformant ? (
          <Badge className="bg-green-100 text-green-700">✓ Verified</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700">✗ Failed</Badge>
        )
      case 'SINGLE_SELECT':
      case 'TEXT_INPUT':
      case 'NUMERIC_INPUT':
        return <span className="font-medium">{item.resultValue}</span>
      default:
        return <span>{item.resultValue}</span>
    }
  }

  const groupItemsBySection = (items: QCResultItem[]) => {
    const grouped: { [key: string]: QCResultItem[] } = {}
    items.forEach(item => {
      const section = item.qcFormTemplateItem.section
      if (!grouped[section]) {
        grouped[section] = []
      }
      grouped[section].push(item)
    })
    return grouped
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ClipboardCheck className="w-8 h-8 animate-pulse" />
        <span className="ml-2">Loading QC results...</span>
      </div>
    )
  }

  if (qcResults.length === 0) {
    return (
      <Alert>
        <FileText className="w-4 h-4" />
        <AlertDescription>
          No QC results found for this order.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">QC Results</h1>
          <p className="text-slate-600">
            Quality control inspection results for PO: {orderData?.poNumber}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* QC Results */}
      {qcResults.map((result, index) => {
        const StatusIcon = getStatusIcon(result.overallStatus)
        const groupedItems = groupItemsBySection(result.itemResults)

        return (
          <Card key={result.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    {result.qcFormTemplate.name}
                  </CardTitle>
                  <CardDescription>{result.qcFormTemplate.description}</CardDescription>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 ${result.overallStatus === 'PASSED' ? 'text-green-500' : 'text-red-500'}`} />
                      <Badge className={getStatusColor(result.overallStatus)}>
                        {result.overallStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {result.qcPerformedBy.fullName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(result.qcTimestamp), "MMM dd, yyyy HH:mm")}
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Inspector Notes */}
              {result.notes && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Inspector Notes</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{result.notes}</p>
                </div>
              )}

              {/* Checklist Items by Section */}
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([section, items]) => (
                  <div key={section}>
                    <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {section}
                    </h4>
                    
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg bg-slate-50">
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-1">
                              {item.qcFormTemplateItem.checklistItem}
                              {item.qcFormTemplateItem.isRequired && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-slate-600 mt-1">{item.notes}</p>
                            )}
                          </div>
                          
                          <div className="ml-4 text-right">
                            {renderResultValue(item)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {index < Object.entries(groupedItems).length - 1 && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}