"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { QCFormInterface } from "@/components/qc/QCFormInterface"
import { Loader2, AlertCircle } from "lucide-react"

export default function QCInspectionPage() {
  const params = useParams()
  const { toast } = useToast()
  const [orderData, setOrderData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrderData()
  }, [params.orderId])

  const fetchOrderData = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/orders/${params.orderId}`)
      
      if (response.data.success) {
        setOrderData(response.data.data)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QC Inspection</h1>
        <p className="text-slate-600">
          Conduct quality control inspection for PO: {orderData.poNumber}
        </p>
      </div>

      <QCFormInterface
        orderId={params.orderId as string}
        orderData={{
          poNumber: orderData.poNumber,
          customerName: orderData.customerName,
          productFamily: orderData.productFamily || "T2 Sink",
          buildNumbers: orderData.buildNumbers
        }}
      />
    </div>
  )
}