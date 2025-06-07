"use client"

import { useState, useEffect } from "react"
import { useOrderCreateStore, SelectedAccessory } from "@/stores/orderCreateStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle, 
  Loader2,
  AlertCircle,
  User,
  Package,
  Settings,
  ShoppingCart,
  Calendar,
  FileText,
  MapPin,
  Droplets,
  Wrench,
  Grid3x3,
  Edit
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { BOMViewer } from "./BOMViewer"
import { format } from "date-fns"
import { generateOrderDescription, generateShortDescription, generateSinkModel } from "@/lib/descriptionGenerator"

interface OrderSubmitResponse {
  success: boolean
  orderId?: string
  message?: string
  bomId?: string
}

interface ReviewStepProps {
  isEditMode?: boolean
  orderId?: string
}

// Part/Assembly description mappings (copied from order details page)
const partDescriptions: Record<string, string> = {
  // Sink Models
  'MDRD_B1_ESINK_48': 'Single Basin E-Sink (48")',
  'MDRD_B1_ESINK_60': 'Single Basin E-Sink (60")',
  'MDRD_B1_ESINK_72': 'Single Basin E-Sink (72")',
  'MDRD_B2_ESINK_48': 'Double Basin E-Sink (48")',
  'MDRD_B2_ESINK_60': 'Double Basin E-Sink (60")',
  'MDRD_B2_ESINK_72': 'Double Basin E-Sink (72")',
  'MDRD_B3_ESINK_72': 'Triple Basin E-Sink (72")',
  'MDRD_B3_ESINK_84': 'Triple Basin E-Sink (84")',
  
  // Legs
  'T2-DL27-KIT': 'Fixed Height 27" Stainless Steel Legs',
  'T2-DL14-KIT': 'Fixed Height 14" Stainless Steel Legs',
  'T2-LC1-KIT': 'Height Adjustable Stainless Steel Legs (27-35")',
  'T2-DL27-FH-KIT': 'Fixed Height 27" Legs with Front Handle',
  'T2-DL14-FH-KIT': 'Fixed Height 14" Legs with Front Handle',
  
  // Feet
  'T2-LEVELING-CASTOR-475': 'Leveling Casters with Brake (4x)',
  'T2-SEISMIC-FEET': 'Seismic Feet for Earthquake Safety',
  
  // Control Boxes
  'T2-CB-BASIC': 'Basic Control Box - Manual Controls',
  'T2-CB-ADVANCED': 'Advanced Control Box - Digital Display',
  'T2-CB-PREMIUM': 'Premium Control Box - Touch Screen',
  
  // Pegboard Types
  'PERF': 'Perforated Pegboard',
  'SOLID': 'Solid Pegboard',
  
  // Basin Types
  'E_SINK': 'Standard E-Sink Basin',
  'E_SINK_DI': 'E-Sink Basin with Deionized Water',
  'E_DRAIN': 'E-Drain Basin for Drainage',
  
  // Basin Sizes
  'T2-ADW-BASIN20X20X8': 'Basin 20" x 20" x 8"',
  'T2-ADW-BASIN24X20X8': 'Basin 24" x 20" x 8"',
  'T2-ADW-BASIN24X20X10': 'Basin 24" x 20" x 10"',
  'T2-ADW-BASIN30X20X8': 'Basin 30" x 20" x 8"',
  'T2-ADW-BASIN30X20X10': 'Basin 30" x 20" x 10"',
  
  // Faucet Types
  'T2-FAUCET-STANDARD': 'Standard Single Handle Faucet',
  'T2-FAUCET-DUAL': 'Dual Handle Hot/Cold Faucet',
  'T2-FAUCET-SENSOR': 'Sensor Activated Touchless Faucet',
  'T2-FAUCET-KNEE': 'Knee Operated Hands-Free Faucet',
  
  // Sprayer Types
  'T2-SPRAYER-HANDHELD': 'Handheld Flexible Sprayer',
  'T2-SPRAYER-FIXED': 'Fixed Position Sprayer',
  'T2-SPRAYER-RETRACTABLE': 'Retractable Pull-Out Sprayer',
}

const getPartDescription = (partId: string): string => {
  return partDescriptions[partId] || partId
}

// Helper functions for display
const extractColorFromId = (colorId: string) => {
  if (!colorId) return 'None'
  const colorMap: { [key: string]: string } = {
    'T-OA-PB-COLOR-GREEN': 'Green',
    'T-OA-PB-COLOR-BLUE': 'Blue', 
    'T-OA-PB-COLOR-RED': 'Red',
    'T-OA-PB-COLOR-BLACK': 'Black',
    'T-OA-PB-COLOR-YELLOW': 'Yellow',
    'T-OA-PB-COLOR-GREY': 'Grey',
    'T-OA-PB-COLOR-ORANGE': 'Orange',
    'T-OA-PB-COLOR-WHITE': 'White'
  }
  return colorMap[colorId] || colorId
}

const getDrawerDisplayName = (drawerId: string) => {
  const drawerMap: { [key: string]: string } = {
    'DRAWER_LEFT': 'Left Drawer',
    'DRAWER_RIGHT': 'Right Drawer', 
    'DRAWER_CENTER': 'Center Drawer',
    'COMPARTMENT_LEFT': 'Left Compartment',
    'COMPARTMENT_RIGHT': 'Right Compartment',
    'COMPARTMENT_CENTER': 'Center Compartment'
  }
  return drawerMap[drawerId] || drawerId
}

export function ReviewStep({ isEditMode = false, orderId }: ReviewStepProps) {
  const { 
    customerInfo, 
    sinkSelection, 
    configurations, 
    accessories, 
    resetForm 
  } = useOrderCreateStore()
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<OrderSubmitResponse | null>(null)
  const [bomPreviewLoading, setBomPreviewLoading] = useState(false)
  const [bomPreviewError, setBomPreviewError] = useState<string | null>(null)
  const [bomPreviewData, setBomPreviewData] = useState<any>(null)
  const [autoControlBoxes, setAutoControlBoxes] = useState<Record<string, any>>({})

  // Load BOM preview and auto-determine control boxes on component mount
  useEffect(() => {
    if (!isEditMode) {
      previewBOM()
    }
    determineControlBoxes()
  }, [])

  const determineControlBoxes = async () => {
    const controlBoxResults: Record<string, any> = {}
    
    for (const buildNumber of sinkSelection.buildNumbers) {
      const config = configurations[buildNumber]
      if (config?.basins && config.basins.length > 0) {
        try {
          const response = await nextJsApiClient.post('/configurator/control-box', {
            basinConfigurations: config.basins
          })
          
          if (response.data.success && response.data.data) {
            controlBoxResults[buildNumber] = response.data.data
          }
        } catch (error) {
          console.error(`Error determining control box for ${buildNumber}:`, error)
        }
      }
    }
    
    setAutoControlBoxes(controlBoxResults)
  }

  const previewBOM = async () => {
    setBomPreviewLoading(true)
    setBomPreviewError(null)
    
    try {
      const requestBody = {
        customerInfo,
        sinkSelection,
        configurations,
        accessories
      }

      const response = await nextJsApiClient.post('/orders/preview-bom', requestBody)
      
      if (response.data.success) {
        setBomPreviewData(response.data.data)
      } else {
        setBomPreviewError(response.data.message || 'Failed to generate BOM preview')
      }
    } catch (error: any) {
      console.error('BOM preview error:', error)
      setBomPreviewError(error.response?.data?.message || 'Failed to generate BOM preview')
    } finally {
      setBomPreviewLoading(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const endpoint = isEditMode ? `/orders/${orderId}` : '/orders'
      const method = isEditMode ? 'put' : 'post'
      
      const requestBody = {
        customerInfo,
        sinkSelection,
        configurations,
        accessories
      }

      const response = await nextJsApiClient[method](endpoint, requestBody)

      if (response.data.success) {
        const createdOrderId = response.data.orderId || orderId
        
        // Handle file upload if there's a PO document
        if (customerInfo.poDocument && customerInfo.poDocument instanceof File) {
          try {
            console.log('Uploading PO document:', customerInfo.poDocument.name)
            const formData = new FormData()
            formData.append('file', customerInfo.poDocument)
            formData.append('orderId', createdOrderId)
            formData.append('docType', 'PO_DOCUMENT')

            const uploadResponse = await nextJsApiClient.post('/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })
            
            if (uploadResponse.data.success) {
              console.log('File uploaded successfully:', uploadResponse.data.fileName)
            } else {
              console.warn('File upload failed:', uploadResponse.data.message)
            }
          } catch (fileUploadError: any) {
            console.error('File upload error:', fileUploadError)
            console.error('File upload error response:', fileUploadError.response?.data)
            // Don't fail the order creation if file upload fails
            // But show a warning to the user in future iterations
          }
        }
        
        setSubmitSuccess(response.data)
        
        if (!isEditMode) {
          // Reset form and redirect to new order
          setTimeout(() => {
            resetForm()
            router.push(`/orders/${response.data.orderId}`)
          }, 2000)
        } else {
          // Redirect to updated order
          setTimeout(() => {
            router.push(`/orders/${orderId}`)
          }, 2000)
        }
      } else {
        setSubmitError(response.data.message || 'Failed to process order')
      }
    } catch (error: any) {
      console.error('Order submission error:', error)
      setSubmitError(error.response?.data?.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate total accessories count
  const totalAccessoriesCount = Object.values(accessories).reduce((total, buildAccessories) => {
    return total + (buildAccessories as SelectedAccessory[]).length
  }, 0)

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between py-3 border-b">
        <div>
          <h1 className="text-xl font-bold">Order Review</h1>
          <p className="text-sm text-slate-600">Review all order details before {isEditMode ? 'updating' : 'submission'}</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {isEditMode ? 'Edit Mode' : 'New Order'}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          <TabsTrigger value="submit">Submit Order</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3">
          {/* Unified Order Information */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 border-b pb-1">Customer</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500 block">Name</span>
                    <span className="font-medium">{customerInfo.customerName}</span>
                  </div>
                  {customerInfo.projectName && (
                    <div>
                      <span className="text-slate-500 block">Project</span>
                      <span className="font-medium">{customerInfo.projectName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Sales Person</span>
                    <span className="font-medium">{customerInfo.salesPerson}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Language</span>
                    <span className="font-medium">
                      {customerInfo.language === "EN" ? "English" : 
                       customerInfo.language === "FR" ? "French" : "Spanish"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 border-b pb-1">Order Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500 block">PO Number</span>
                    <span className="font-medium">{customerInfo.poNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Build Numbers</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sinkSelection.buildNumbers.map((bn: string) => (
                        <Badge key={bn} variant="outline" className="text-xs">{bn}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sink Model</span>
                    <span className="font-medium">{generateSinkModel({ sinkSelection, configurations })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 border-b pb-1">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500 block">Want Date</span>
                    <span className="font-medium">
                      {customerInfo.wantDate ? format(new Date(customerInfo.wantDate), "MMM dd, yyyy") : 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Quantity</span>
                    <span className="font-medium">{sinkSelection.quantity} Unit{sinkSelection.quantity !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 border-b pb-1">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500 block">Configurations</span>
                    <span className="font-medium">{Object.keys(configurations).length} build{Object.keys(configurations).length !== 1 ? 's' : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Accessories</span>
                    <span className="font-medium">{totalAccessoriesCount} item{totalAccessoriesCount !== 1 ? 's' : ''}</span>
                  </div>
                  {customerInfo.poDocument && (
                    <div>
                      <span className="text-slate-500 block">PO Document</span>
                      <span className="font-medium">{customerInfo.poDocument.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Product Description */}
          <Card>
            <CardHeader>
              <CardTitle>Product Description</CardTitle>
              <CardDescription>Detailed specification of your configured sink</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Full Description */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">complete specification</h4>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    {generateOrderDescription({ sinkSelection, configurations })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          {customerInfo.poDocument && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Documents</CardTitle>
                <CardDescription>Documents that will be uploaded with this order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <FileText className="w-8 h-8 text-slate-500" />
                  <div>
                    <p className="font-medium">{customerInfo.poDocument.name}</p>
                    <p className="text-sm text-slate-500">
                      {(customerInfo.poDocument.size / 1024 / 1024).toFixed(2)} MB • {customerInfo.poDocument.type}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {customerInfo.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{customerInfo.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          {sinkSelection.buildNumbers.map((buildNumber: string) => {
            const config = configurations[buildNumber]
            const buildAccessories = accessories[buildNumber] || []

            if (!config) return null

            return (
              <Card key={buildNumber}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Build Number: {buildNumber}</span>
                    <Badge variant="outline">{buildNumber}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sink Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Sink Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Model:</span>
                          <span className="font-medium">{getPartDescription(config.sinkModelId) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Width:</span>
                          <span className="font-medium">{config.width || 'N/A'} inches</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Length:</span>
                          <span className="font-medium">{config.length || 'N/A'} inches</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Workflow Direction:</span>
                          <span className="font-medium">{config.workflowDirection?.replace('_', ' to ') || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Support Structure</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Legs:</span>
                          <span className="font-medium">{getPartDescription(config.legsTypeId || '') || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Feet:</span>
                          <span className="font-medium">{getPartDescription(config.feetTypeId || '') || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Control Box:</span>
                          <div className="text-right">
                            <span className="font-medium">
                              {config.controlBoxId ? 
                                getPartDescription(config.controlBoxId) : 
                                autoControlBoxes[buildNumber] ? 
                                  `${autoControlBoxes[buildNumber].name} (Auto)` : 
                                  'Determining...'
                              }
                            </span>
                            {autoControlBoxes[buildNumber] && (
                              <div className="text-xs text-slate-500 mt-1">
                                {autoControlBoxes[buildNumber].mappingRule}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Pegboard & Storage</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Has Pegboard:</span>
                          <span className="font-medium">{config.pegboard ? 'Yes' : 'No'}</span>
                        </div>
                        {config.pegboard && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Pegboard Type:</span>
                              <span className="font-medium">{getPartDescription(config.pegboardTypeId || '') || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Pegboard Color:</span>
                              <span className="font-medium">{extractColorFromId(config.pegboardColorId || '') || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Size:</span>
                              <span className="font-medium">Auto-calculated for {config.length}" length</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Drawers & Compartments:</span>
                          <span className="font-medium">{config.drawersAndCompartments?.length || 0} items</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drawers & Compartments */}
                  {config.drawersAndCompartments && config.drawersAndCompartments.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Drawers & Compartments</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {config.drawersAndCompartments.map((item: string, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                              <span className="text-sm font-medium">{getDrawerDisplayName(item)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Basin Configurations */}
                  {config.basins && config.basins.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Basin Configurations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {config.basins.map((basin: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                            <h5 className="font-medium mb-2">Basin {idx + 1}</h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Type:</span>
                                <span className="font-medium">{getPartDescription(basin.basinType)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Size:</span>
                                <span className="font-medium">{getPartDescription(basin.basinSizePartNumber)}</span>
                              </div>
                              {basin.customDimensions && (
                                <div className="text-xs text-slate-600 mt-2">
                                  Custom: {basin.customDimensions.width}"W × {basin.customDimensions.length}"L × {basin.customDimensions.depth}"D
                                </div>
                              )}
                              {basin.addonIds?.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-slate-500 block">Add-ons:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {basin.addonIds.map((addon: string, addonIdx: number) => (
                                      <Badge key={addonIdx} variant="secondary" className="text-xs">{addon}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Faucet Configurations */}
                  {config.faucets && config.faucets.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Faucet Configurations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {config.faucets.map((faucet: any, idx: number) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                            <h5 className="font-medium mb-2">Faucet {idx + 1}</h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Type:</span>
                                <span className="font-medium">{getPartDescription(faucet.faucetTypeId)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Quantity:</span>
                                <span className="font-medium">{faucet.quantity || 1}</span>
                              </div>
                              {faucet.placement && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Placement:</span>
                                  <span className="font-medium">{faucet.placement}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sprayer Configurations */}
                  {config.sprayers && config.sprayers.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Sprayer Configurations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {config.sprayers.map((sprayer: any, idx: number) => (
                          <div key={idx} className="p-3 bg-green-50 rounded-lg">
                            <h5 className="font-medium mb-2">Sprayer {idx + 1}</h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Type:</span>
                                <span className="font-medium">{getPartDescription(sprayer.sprayerTypeId)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Quantity:</span>
                                <span className="font-medium">{sprayer.quantity || 1}</span>
                              </div>
                              {sprayer.location && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Location:</span>
                                  <span className="font-medium">{sprayer.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accessories for this build */}
                  {buildAccessories.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Selected Accessories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {buildAccessories.map((accessory: SelectedAccessory, idx: number) => (
                          <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Assembly ID:</span>
                                <span className="font-medium">{accessory.assemblyId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Quantity:</span>
                                <span className="font-medium">{accessory.quantity}</span>
                              </div>
                              {accessory.name && (
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Name:</span>
                                  <span className="font-medium">{accessory.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom" className="space-y-3">
          {bomPreviewLoading ? (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Generating BOM preview...</p>
              </CardContent>
            </Card>
          ) : bomPreviewError ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{bomPreviewError}</p>
                <Button onClick={previewBOM} variant="outline">
                  Retry BOM Preview
                </Button>
              </CardContent>
            </Card>
          ) : bomPreviewData?.bom ? (
            <>
              {/* BOM Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Items</span>
                    <span className="text-2xl font-bold text-blue-600">{bomPreviewData.totalItems || 0}</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">System Components</span>
                    <span className="text-2xl font-bold text-green-600">{bomPreviewData.summary?.systemComponents || 0}</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Structural</span>
                    <span className="text-2xl font-bold text-purple-600">{bomPreviewData.summary?.structuralComponents || 0}</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Accessories</span>
                    <span className="text-2xl font-bold text-orange-600">{bomPreviewData.summary?.accessoryComponents || 0}</span>
                  </div>
                </Card>
              </div>

              {/* Enhanced BOM Viewer */}
              <BOMViewer
                bomItems={bomPreviewData.bom?.flattened || []}
                orderData={{
                  customerInfo,
                  sinkSelection,
                  configurations,
                  accessories
                }}
                customerInfo={customerInfo}
                showDebugInfo={false}
              />
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No BOM data available</p>
                <Button onClick={previewBOM} variant="outline" className="mt-2">
                  Generate BOM Preview
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Submit Tab */}
        <TabsContent value="submit" className="space-y-4">
          {submitSuccess ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Order {isEditMode ? 'updated' : 'created'} successfully! 
                {submitSuccess.orderId && ` Order ID: ${submitSuccess.orderId}`}
                <br />
                Redirecting to order details...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>{isEditMode ? 'Update Order' : 'Submit Order'}</CardTitle>
                  <CardDescription>
                    {isEditMode 
                      ? 'Save your changes to update this order configuration.'
                      : 'Review and submit your order for processing. Once submitted, the order will enter the production workflow.'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium mb-2">Order Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 block">PO Number</span>
                        <span className="font-medium">{customerInfo.poNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Customer</span>
                        <span className="font-medium">{customerInfo.customerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Quantity</span>
                        <span className="font-medium">{sinkSelection.quantity} Unit{sinkSelection.quantity !== 1 ? 's' : ''}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Build Numbers</span>
                        <span className="font-medium">{sinkSelection.buildNumbers.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                    >
                      Go Back
                    </Button>
                    <Button
                      onClick={handleSubmitOrder}
                      disabled={isSubmitting}
                      className="min-w-[140px]"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {isEditMode 
                        ? (isSubmitting ? 'Updating...' : 'Update Order')
                        : (isSubmitting ? 'Submitting...' : 'Submit Order')
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}