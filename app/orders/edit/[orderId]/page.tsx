"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { OrderWizard } from "@/components/order/OrderWizard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Info
} from "lucide-react"

export default function EditOrderPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    updateCustomerInfo, 
    updateSinkSelection, 
    updateSinkConfiguration,
    updateAccessories,
    resetForm 
  } = useOrderCreateStore()

  useEffect(() => {
    fetchOrderDetails()
  }, [params.orderId])

  const fetchOrderDetails = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${params.orderId}`)
      if (response.data.success) {
        const orderData = response.data.data
        
        // Check if order can be edited
        if (orderData.orderStatus !== 'ORDER_CREATED') {
          setError(`Order cannot be edited. Current status: ${orderData.orderStatus}`)
          return
        }
        
        setOrder(orderData)
        
        // Load order data into the store
        loadOrderIntoStore(orderData)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch order details",
        variant: "destructive"
      })
      setError("Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  const loadOrderIntoStore = (orderData: any) => {
    // Reset the form first
    resetForm()
    
    // Load customer information
    updateCustomerInfo({
      poNumber: orderData.poNumber,
      customerName: orderData.customerName,
      projectName: orderData.projectName || '',
      salesPerson: orderData.salesPerson,
      wantDate: orderData.wantDate ? new Date(orderData.wantDate) : null,
      language: orderData.language,
      notes: orderData.notes || '',
      poDocument: null // Cannot restore file upload
    })
    
    // Load sink selection
    const buildNumbers = orderData.sinkConfigurations.map((config: any) => config.buildNumber)
    updateSinkSelection({
      sinkFamily: orderData.sinkFamily,
      quantity: buildNumbers.length,
      buildNumbers: buildNumbers
    })
    
    // Load configurations for each build number
    orderData.sinkConfigurations.forEach((sinkConfig: any) => {
      const configuration: any = {
        sinkModelId: sinkConfig.sinkModelId,
        width: sinkConfig.width,
        length: sinkConfig.length,
        legsTypeId: sinkConfig.legsTypeId,
        feetTypeId: sinkConfig.feetTypeId,
        workflowDirection: sinkConfig.workflowDirection,
        pegboard: sinkConfig.pegboard || false,
        pegboardTypeId: sinkConfig.pegboardTypeId,
        pegboardColorId: sinkConfig.pegboardColorId,
        drawersAndCompartments: sinkConfig.drawersAndCompartments || [],
        controlBoxId: sinkConfig.controlBoxId || null,
        basins: []
      }
      
      // Load basin configurations
      const basins = orderData.basinConfigurations
        .filter((basin: any) => basin.buildNumber === sinkConfig.buildNumber)
        .map((basin: any) => ({
          basinTypeId: basin.basinTypeId,
          basinType: basin.basinType,
          basinSizePartNumber: basin.basinSizePartNumber,
          basinSize: basin.basinSizePartNumber,
          customWidth: basin.customWidth,
          customLength: basin.customLength,
          customDepth: basin.customDepth,
          addonIds: basin.addonIds || []
        }))
      configuration.basins = basins
      
      // Load faucet configurations
      const faucets = orderData.faucetConfigurations
        .filter((faucet: any) => faucet.buildNumber === sinkConfig.buildNumber)
        .map((faucet: any) => ({
          id: faucet.id,
          faucetTypeId: faucet.faucetTypeId,
          placement: faucet.faucetPlacement
        }))
      configuration.faucets = faucets
      
      // Load sprayer configurations
      const sprayer = orderData.sprayerConfigurations
        .find((sprayer: any) => sprayer.buildNumber === sinkConfig.buildNumber)
      if (sprayer) {
        configuration.hasSprayer = sprayer.hasSpray
        configuration.sprayerTypeIds = sprayer.sprayerTypeIds
        configuration.sprayerQuantity = sprayer.sprayerQuantity
        configuration.sprayerLocation = sprayer.sprayerLocation
      }
      
      updateSinkConfiguration(sinkConfig.buildNumber, configuration)
    })
    
    // Load accessories
    orderData.selectedAccessories.forEach((accessory: any) => {
      updateAccessories(accessory.buildNumber, [{
        assemblyId: accessory.assemblyId,
        name: accessory.assembly?.name || accessory.assemblyId,
        quantity: accessory.quantity,
        price: 0 // Price not stored in current schema
      }])
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Cannot Edit Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push(`/orders/${params.orderId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Order Details
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/orders/${params.orderId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Order Details
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Edit Order Configuration</CardTitle>
            <CardDescription>
              Modifying order: {order?.poNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Edit Mode</AlertTitle>
              <AlertDescription>
                You are editing an existing order. Changes will update the configuration and regenerate the BOM.
                The order history will track all modifications.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Order Wizard in Edit Mode */}
      <OrderWizard 
        isEditMode={true}
        orderId={params.orderId as string}
      />
    </div>
  )
}