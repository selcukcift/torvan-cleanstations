"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer } from "lucide-react"
import { PrintableOrderSummary } from "@/components/order/PrintableOrderSummary"
import { useToast } from "@/hooks/use-toast"

export default function PrintOrderPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [bomItems, setBomItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderData()
  }, [params.orderId])

  const fetchOrderData = async () => {
    try {
      setLoading(true)
      
      // Fetch order details
      const orderResponse = await nextJsApiClient.get(`/orders/${params.orderId}`)
      if (orderResponse.data.success) {
        setOrder(orderResponse.data.data)
        
        // Try to fetch BOM if available
        const bomData = orderResponse.data.data.generatedBoms?.[0] || orderResponse.data.data.boms?.[0]
        if (bomData?.bomItems) {
          setBomItems(bomData.bomItems)
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load order data for printing",
        variant: "destructive"
      })
      console.error('Print data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleGoBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading order data...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-slate-600 mb-4">Order not found</p>
          <Button onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold">Print Order Summary</h1>
            <p className="text-sm text-slate-600">PO: {order.poNumber} - {order.customerName}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-7xl mx-auto">
        <PrintableOrderSummary 
          order={order}
          bomItems={bomItems}
          showBOM={bomItems.length > 0}
          showConfiguration={true}
          showQCResults={false}
        />
      </div>

      {/* Print-specific global styles */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @page {
            margin: 0.75in;
            size: letter;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
            color: #000 !important;
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print-page-break {
            page-break-before: always;
          }
          
          .no-break {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}