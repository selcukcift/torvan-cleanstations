"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { QCFormInterface } from "@/components/qc/QCFormInterface"
import { QCFormWithDocuments } from "@/components/qc/QCFormWithDocuments"
import { QCFormInterfaceEnhanced } from "@/components/qc/QCFormInterfaceEnhanced"
import { QCTabbedInterface } from "@/components/qc/QCTabbedInterface"
import { QCChecklistInterface } from "@/components/qc/QCChecklistInterface"
import { QCResultsViewer } from "@/components/qc/QCResultsViewer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Info } from "lucide-react"

export default function QCInspectionPage() {
  const params = useParams()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [orderData, setOrderData] = useState<any>(null)
  const [qcTemplate, setQcTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrderData()
  }, [params.orderId])

  const fetchOrderData = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/orders/${params.orderId}`)
      
      if (response.data.success) {
        const order = response.data.data
        setOrderData(order)
        
        // Check order status and fetch appropriate QC template
        if (order.orderStatus === 'READY_FOR_PRE_QC') {
          await fetchQCTemplate('Pre-Production Check')
        } else if (order.orderStatus === 'READY_FOR_FINAL_QC') {
          await fetchQCTemplate('Final QC')
        }
      } else {
        setError("Order not found")
      }
    } catch (error: any) {
      console.error('Error fetching order data:', error)
      setError("Failed to load order data")
      toast({
        title: "Error",
        description: "Failed to load order data for QC inspection",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  const fetchQCTemplate = async (formType: string) => {
    try {
      setTemplateLoading(true)
      const response = await nextJsApiClient.get(`/orders/${params.orderId}/qc/template?formType=${encodeURIComponent(formType)}`)
      
      if (response.data.success) {
        setQcTemplate(response.data.template)
        // Store order configuration for verification
        if (response.data.orderConfiguration) {
          setQcTemplate({
            ...response.data.template,
            orderConfiguration: response.data.orderConfiguration
          })
        }
      } else {
        console.error('No QC template found for form type:', formType)
        toast({
          title: "Warning",
          description: `No ${formType} template found. Please contact admin.`,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Error fetching QC template:', error)
      toast({
        title: "Error",
        description: "Failed to load QC template",
        variant: "destructive"
      })
    } finally {
      setTemplateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !orderData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-medium">{error || "Order not found"}</p>
      </div>
    )
  }

  // Determine which QC phase we're in or have completed
  const getQCPhase = () => {
    if (orderData?.orderStatus === 'READY_FOR_PRE_QC') return 'Pre-Production Check'
    if (orderData?.orderStatus === 'READY_FOR_FINAL_QC') return 'Final QC'
    if (orderData?.orderStatus === 'READY_FOR_PRODUCTION') return 'Pre-Production Check (Completed)'
    if (orderData?.orderStatus === 'READY_FOR_SHIP') return 'Final QC (Completed)'
    if (orderData?.orderStatus === 'TESTING_COMPLETE') return 'QC (Completed)'
    return 'Unknown'
  }

  const isValidQCStatus = [
    'READY_FOR_PRE_QC', 
    'READY_FOR_FINAL_QC',
    'READY_FOR_PRODUCTION', // Allow viewing completed Pre-QC
    'READY_FOR_SHIP', // Allow viewing completed Final QC
    'TESTING_COMPLETE' // Allow viewing completed QC
  ].includes(orderData?.orderStatus || '')

  const isQCCompleted = [
    'READY_FOR_PRODUCTION',
    'READY_FOR_SHIP', 
    'TESTING_COMPLETE'
  ].includes(orderData?.orderStatus || '')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QC Inspection</h1>
        <p className="text-slate-600">
          Conduct quality control inspection for PO: {orderData.poNumber}
        </p>
        <div className="mt-2">
          <span className="text-sm font-medium">Phase: </span>
          <span className="text-sm text-blue-600">{getQCPhase()}</span>
        </div>
      </div>

      {!isValidQCStatus && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This order is not ready for QC inspection. Current status: {orderData?.orderStatus || 'Unknown'}
            {orderData?.orderStatus === 'ORDER_CREATED' && ' (Waiting for procurement approval)'}
            {orderData?.orderStatus === 'SINK_BODY_EXTERNAL_PRODUCTION' && ' (Sink body in external production)'}
            {orderData?.orderStatus === 'READY_FOR_PRODUCTION' && ' (Currently in production)'}
            {orderData?.orderStatus === 'READY_FOR_SHIP' && ' (QC complete, ready for shipping)'}
          </AlertDescription>
        </Alert>
      )}

      {templateLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading QC template...</span>
        </div>
      )}

      {isValidQCStatus && (
        isQCCompleted ? (
          // Show QC results for completed inspections
          <QCResultsViewer
            orderId={params.orderId as string}
            orderData={{
              poNumber: orderData.poNumber,
              customerName: orderData.customerName,
              buildNumbers: orderData.buildNumbers,
              status: orderData.orderStatus
            }}
          />
        ) : qcTemplate ? (
          // Show QC form for pending inspections
          getQCPhase() === 'Pre-Production Check' ? (
            <QCChecklistInterface
              orderId={params.orderId as string}
              orderData={{
                poNumber: orderData.poNumber,
                customerName: orderData.customerName,
                buildNumbers: orderData.buildNumbers,
                status: orderData.orderStatus
              }}
              template={qcTemplate}
              session={session}
              orderConfiguration={qcTemplate?.orderConfiguration}
            />
          ) : (
            <QCTabbedInterface
              orderId={params.orderId as string}
              orderData={{
                poNumber: orderData.poNumber,
                customerName: orderData.customerName,
                buildNumbers: orderData.buildNumbers,
                status: orderData.orderStatus
              }}
              template={qcTemplate}
              session={session}
              orderConfiguration={qcTemplate?.orderConfiguration}
            />
          )
        ) : null
      )}

      {isValidQCStatus && !templateLoading && !qcTemplate && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No QC template available for {getQCPhase()}. Please contact system administrator.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}