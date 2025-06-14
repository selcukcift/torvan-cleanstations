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
  'T2-DL27-KIT': 'Height Adjustable Column Kit (DL27)',
  'T2-DL14-KIT': 'Height Adjustable Column Kit (DL14)',
  'T2-LC1-KIT': 'Height Adjustable Triple Column Kit (LC1)',
  'T2-DL27-FH-KIT': 'Fixed Height Column Kit (DL27)',
  'T2-DL14-FH-KIT': 'Fixed Height Column Kit (DL14)',
  
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
  'T2-OA-STD-FAUCET-WB-KIT': '10" Wrist Blade, Swing Spout, Wall Mounted Faucet Kit',
  'T2-OA-PRE-RINSE-FAUCET-KIT': 'Pre-Rinse Overhead Spray Unit Kit',
  'T2-OA-DI-GOOSENECK-FAUCET-KIT': 'Gooseneck Treated Water Faucet Kit, PVC',
  
  // Sprayer Types
  'T2-SPRAYER-HANDHELD': 'Handheld Flexible Sprayer',
  'T2-SPRAYER-FIXED': 'Fixed Position Sprayer',
  'T2-SPRAYER-RETRACTABLE': 'Retractable Pull-Out Sprayer',
  'T2-OA-WATERGUN-TURRET-KIT': 'Water Gun Kit & Turret, Treated Water Compatible',
  'T2-OA-WATERGUN-ROSETTE-KIT': 'Water Gun Kit & Rosette, Treated Water Compatible',
  'T2-OA-AIRGUN-TURRET-KIT': 'Air Gun Kit & Turret',
  'T2-OA-AIRGUN-ROSETTE-KIT': 'Air Gun Kit & Rosette',
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
    'DRAWER': 'Drawer',
    'COMPARTMENT': 'Compartment'
  }
  return drawerMap[drawerId] || drawerId
}

// Helper function to format basin type description
const getBasinTypeDescription = (basinTypeId: string) => {
  const basinTypeMap: { [key: string]: string } = {
    'E_DRAIN': 'E-Drain Basin Kit with Overflow Protection',
    'E_SINK': 'E-Sink Basin Kit with Automated Dosing',
    'E_SINK_DI': 'E-Sink Kit for DI Water (No Bottom Fill)'
  }
  return basinTypeMap[basinTypeId] || getPartDescription(basinTypeId)
}

// Helper function to format basin size (remove "Basin" wording)
const getBasinSizeDescription = (basinSizePartNumber: string) => {
  const description = getPartDescription(basinSizePartNumber)
  return description.replace(/^Basin\s+/, '')
}

// Helper function to format pegboard type (proper case)
const getPegboardTypeDescription = (pegboardTypeId: string) => {
  const description = getPartDescription(pegboardTypeId)
  if (description.toLowerCase().includes('perforated')) {
    return description.replace(/perforated/gi, 'Perforated')
  }
  return description
}

// Helper function to format pegboard size
const getPegboardSizeDescription = (length: string | number) => {
  return `${length}" x 36" H`
}

// Helper function to format workflow direction (fix underscores and caps)
const formatWorkflowDirection = (direction: string) => {
  if (!direction) return 'N/A'
  return direction
    .split('_')
    .map((word, index) => {
      if (word.toLowerCase() === 'to') return 'to'
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

// Helper function to format placement (fix underscores and caps)
const formatPlacement = (placement: string) => {
  if (!placement) return 'N/A'
  
  // Handle special patterns like BETWEEN_1_2
  if (placement.includes('BETWEEN_') && placement.match(/\d+_\d+/)) {
    const match = placement.match(/BETWEEN_(\d+)_(\d+)/)
    if (match) {
      return `Between Basins ${match[1]} & ${match[2]}`
    }
  }
  
  // Handle CENTER case
  if (placement.toUpperCase() === 'CENTER') {
    return 'Center'
  }
  
  // General underscore and caps formatting
  return placement
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to format location (fix underscores and caps)
const formatLocation = (location: string) => {
  if (!location) return 'N/A'
  
  // Handle special patterns like BETWEEN_1_2
  if (location.includes('BETWEEN_') && location.match(/\d+_\d+/)) {
    const match = location.match(/BETWEEN_(\d+)_(\d+)/)
    if (match) {
      return `Between Basins ${match[1]} & ${match[2]}`
    }
  }
  
  // Handle directional patterns like LEFT_TO_RIGHT
  if (location.includes('_TO_')) {
    return location
      .split('_')
      .map((word, index) => {
        if (word.toLowerCase() === 'to') return 'to'
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  }
  
  // Handle simple directional terms
  if (location.toUpperCase() === 'LEFT_SIDE') return 'Left Side'
  if (location.toUpperCase() === 'RIGHT_SIDE') return 'Right Side'
  
  // General underscore and caps formatting
  return location
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Generate model name using the same logic as overview
const generateDisplayModel = (config: any) => {
  if (!config) return 'N/A'
  
  const basinCount = config.basins?.length || 1
  const length = config.length || 48
  const width = config.width || 30
  
  const lengthStr = length.toString().padStart(2, '0')
  const widthStr = width.toString().padStart(2, '0')
  const dimensions = lengthStr + widthStr
  
  return `T2-${basinCount}B-${dimensions}HA`
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

      const response = await nextJsApiClient.post('orders/preview-bom', requestBody)
      
      if (response.data.success) {
        console.log('ReviewStep BOM data received:', response.data)
        
        // Use the same data processing as BOMDebugHelper
        const bomResult = response.data.data.bom || response.data.data
        const processedData = {
          ...response.data.data,
          bom: bomResult,
          totalItems: bomResult.totalItems || (bomResult.flattened || []).length
        }
        
        setBomPreviewData(processedData)
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

  const validateOrderData = () => {
    const errors: string[] = [];

    // Check if all build numbers have configurations
    const missingConfigurations = sinkSelection.buildNumbers.filter(
      buildNumber => !configurations[buildNumber]
    );
    if (missingConfigurations.length > 0) {
      errors.push(`Missing configurations for build numbers: ${missingConfigurations.join(', ')}`);
    }

    // Validate each configuration
    Object.entries(configurations).forEach(([buildNumber, config]) => {
      if (!config) {
        errors.push(`Configuration for build ${buildNumber} is empty`);
        return;
      }

      // Check required fields
      if (!config.sinkModelId) {
        errors.push(`Build ${buildNumber}: Sink model is required`);
      }

      // Check dimensions
      if (!config.width && !config.length && !config.sinkWidth && !config.sinkLength) {
        errors.push(`Build ${buildNumber}: At least one dimension must be provided`);
      }

      // Check length minimum
      const length = config.length || config.sinkLength;
      if (length && length < 48) {
        errors.push(`Build ${buildNumber}: Sink length must be at least 48 inches`);
      }

      // Check basin configurations
      if (!config.basins || config.basins.length === 0) {
        errors.push(`Build ${buildNumber}: At least one basin configuration is required`);
      }

      // Check legs and feet
      if (!config.legsTypeId) {
        errors.push(`Build ${buildNumber}: Legs type is required`);
      }
      if (!config.feetTypeId) {
        errors.push(`Build ${buildNumber}: Feet type is required`);
      }
    });

    return errors;
  };

  const handleSubmitOrder = async () => {
    if (isSubmitting) return

    // Validate order data before submission
    const validationErrors = validateOrderData();
    if (validationErrors.length > 0) {
      setSubmitError(`Please fix the following issues before submitting:\n• ${validationErrors.join('\n• ')}`);
      return;
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const endpoint = isEditMode ? `orders/${orderId}` : 'orders'
      const method = isEditMode ? 'put' : 'post'
      
      const requestBody = {
        customerInfo,
        sinkSelection,
        configurations,
        accessories
      }

      // Log the request body to help debug
      console.log('Order submission request body:', JSON.stringify(requestBody, null, 2))

      const response = await nextJsApiClient[method](endpoint, requestBody)

      if (response.data.success) {
        const createdOrderId = response.data.orderId || orderId
        
        // Handle file uploads if there are documents
        const uploadPromises = []
        
        // Upload PO documents
        if (customerInfo.poDocuments && customerInfo.poDocuments.length > 0) {
          customerInfo.poDocuments.forEach((document, index) => {
            if (document instanceof File) {
              const uploadPODocument = async () => {
                try {
                  console.log(`Uploading PO document ${index + 1}:`, document.name)
                  const formData = new FormData()
                  formData.append('file', document)
                  formData.append('orderId', createdOrderId)
                  formData.append('docType', 'PO_DOCUMENT')

                  const uploadResponse = await nextJsApiClient.post('/upload', formData, {
                    headers: {
                      'Content-Type': 'multipart/form-data'
                    }
                  })
                  
                  if (uploadResponse.data.success) {
                    console.log(`PO document ${index + 1} uploaded successfully:`, uploadResponse.data.fileName)
                  } else {
                    console.warn(`PO document ${index + 1} upload failed:`, uploadResponse.data.message)
                  }
                } catch (fileUploadError: any) {
                  console.error(`PO document ${index + 1} upload error:`, fileUploadError)
                  console.error(`PO document ${index + 1} upload error response:`, fileUploadError.response?.data)
                }
              }
              uploadPromises.push(uploadPODocument())
            }
          })
        }
        
        // Upload sink drawings
        if (customerInfo.sinkDrawings && customerInfo.sinkDrawings.length > 0) {
          customerInfo.sinkDrawings.forEach((drawing, index) => {
            if (drawing instanceof File) {
              const uploadSinkDrawing = async () => {
                try {
                  console.log(`Uploading sink drawing ${index + 1}:`, drawing.name)
                  const formData = new FormData()
                  formData.append('file', drawing)
                  formData.append('orderId', createdOrderId)
                  formData.append('docType', 'SINK_DRAWING')

                  const uploadResponse = await nextJsApiClient.post('/upload', formData, {
                    headers: {
                      'Content-Type': 'multipart/form-data'
                    }
                  })
                  
                  if (uploadResponse.data.success) {
                    console.log(`Sink drawing ${index + 1} uploaded successfully:`, uploadResponse.data.fileName)
                  } else {
                    console.warn(`Sink drawing ${index + 1} upload failed:`, uploadResponse.data.message)
                  }
                } catch (fileUploadError: any) {
                  console.error(`Sink drawing ${index + 1} upload error:`, fileUploadError)
                  console.error(`Sink drawing ${index + 1} upload error response:`, fileUploadError.response?.data)
                }
              }
              uploadPromises.push(uploadSinkDrawing())
            }
          })
        }
        
        // Execute all uploads in parallel
        if (uploadPromises.length > 0) {
          try {
            await Promise.allSettled(uploadPromises)
            console.log('All file uploads completed')
          } catch (error) {
            console.error('Error during file uploads:', error)
            // Don't fail the order creation if file uploads fail
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
      console.error('Error response:', error.response?.data)
      
      // Extract detailed error information
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors)
        const errorMessages = error.response.data.errors.map((err: any) => 
          `${err.path?.join('.')}: ${err.message}`
        ).join(', ')
        setSubmitError(`Validation failed: ${errorMessages}`)
      } else {
        setSubmitError(error.response?.data?.message || 'An unexpected error occurred')
      }
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
                    <span className="text-slate-500 block">{sinkSelection.buildNumbers.length === 1 ? 'Build & Model' : 'Sink Models'}</span>
                    {sinkSelection.buildNumbers.length === 1 ? (
                      <div className="text-sm">
                        <span className="font-medium">{sinkSelection.buildNumbers[0]}: {generateSinkModel({ sinkSelection, configurations })}</span>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {sinkSelection.buildNumbers.map((buildNumber: string) => {
                          const config = configurations[buildNumber]
                          if (!config) return null
                          
                          // Generate sink model for this specific build using the same logic
                          const basinCount = config.basins?.length || 1
                          const length = config.length || 48
                          const width = config.width || 30
                          const lengthStr = length.toString().padStart(2, '0')
                          const widthStr = width.toString().padStart(2, '0')
                          const dimensions = lengthStr + widthStr
                          const buildSinkModel = `T2-${basinCount}B-${dimensions}HA`
                          
                          return (
                            <div key={buildNumber} className="text-xs">
                              <span className="font-medium">{buildNumber}: {buildSinkModel}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
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
                  {customerInfo.poDocuments && customerInfo.poDocuments.length > 0 && (
                    <div>
                      <span className="text-slate-500 block">PO Documents</span>
                      <span className="font-medium">{customerInfo.poDocuments.length} file{customerInfo.poDocuments.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {customerInfo.sinkDrawings && customerInfo.sinkDrawings.length > 0 && (
                    <div>
                      <span className="text-slate-500 block">Sink Drawings</span>
                      <span className="font-medium">{customerInfo.sinkDrawings.length} file{customerInfo.sinkDrawings.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Build-Specific Summaries */}
          {sinkSelection.buildNumbers.length === 1 ? (
            /* Single Build - Show unified description */
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
                <CardDescription>Detailed specification of your configured sink</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-3">Complete Specification</h4>
                    <p className="text-slate-700 leading-relaxed text-sm capitalize">
                      {generateOrderDescription({ sinkSelection, configurations })?.toLowerCase()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Multiple Builds - Show per-build summaries */
            <Card>
              <CardHeader>
                <CardTitle>Build Summaries</CardTitle>
                <CardDescription>Specifications for each sink configuration in this order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sinkSelection.buildNumbers.map((buildNumber: string) => {
                    const config = configurations[buildNumber]
                    const buildAccessories = accessories[buildNumber] || []
                    
                    if (!config) return null
                    
                    return (
                      <div key={buildNumber} className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">{buildNumber}</h4>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">{buildNumber}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 block">Sink Model</span>
                            <span className="font-medium">{getPartDescription(config.sinkModelId) || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Dimensions</span>
                            <span className="font-medium">{config.width}" × {config.length}"</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Legs/Feet</span>
                            <span className="font-medium">{getPartDescription(config.legsTypeId || '') || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Pegboard</span>
                            <span className="font-medium">
                              {config.pegboard ? 
                                `${getPartDescription(config.pegboardTypeId || '')} - ${extractColorFromId(config.pegboardColorId || '')}` : 
                                'No'
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Basins</span>
                            <span className="font-medium">{config.basins?.length || 0} basin{(config.basins?.length || 0) !== 1 ? 's' : ''}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Accessories</span>
                            <span className="font-medium">{buildAccessories.length} item{buildAccessories.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        
                        {(config.basins && config.basins.length > 0) && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <span className="text-slate-500 text-xs block mb-2">Basin Configuration:</span>
                            <div className="flex flex-wrap gap-2">
                              {config.basins.map((basin: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {getPartDescription(basin.basinType)} ({getPartDescription(basin.basinSizePartNumber)})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {((customerInfo.poDocuments && customerInfo.poDocuments.length > 0) || (customerInfo.sinkDrawings && customerInfo.sinkDrawings.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Documents</CardTitle>
                <CardDescription>Documents that will be uploaded with this order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerInfo.poDocuments && customerInfo.poDocuments.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-700 border-b pb-1">PO Documents ({customerInfo.poDocuments.length})</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customerInfo.poDocuments.map((document, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                          <FileText className="w-6 h-6 text-slate-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{document.name}</p>
                            <p className="text-xs text-slate-500">
                              {(document.size / 1024 / 1024).toFixed(2)} MB • {document.type}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">PO Document</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {customerInfo.sinkDrawings && customerInfo.sinkDrawings.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-700 border-b pb-1">Sink Drawings ({customerInfo.sinkDrawings.length})</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customerInfo.sinkDrawings.map((drawing, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{drawing.name}</p>
                            <p className="text-xs text-slate-500">
                              {(drawing.size / 1024 / 1024).toFixed(2)} MB • {drawing.type}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1 bg-blue-100 text-blue-700">Sink Drawing</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Sink Body</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Model:</span>
                          <span className="font-medium">{generateDisplayModel(config)}</span>
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
                          <span className="font-medium">{formatWorkflowDirection(config.workflowDirection || '')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Legs:</span>
                          <span className="font-medium">{getPartDescription(config.legsTypeId || '') || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Feet:</span>
                          <span className="font-medium">{getPartDescription(config.feetTypeId || '') || 'N/A'}</span>
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
                              <span className="font-medium">{getPegboardTypeDescription(config.pegboardTypeId || '') || 'N/A'}</span>
                            </div>
                            {config.pegboardColorId && extractColorFromId(config.pegboardColorId) !== 'N/A' && extractColorFromId(config.pegboardColorId) !== 'None' && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Pegboard Color:</span>
                                <span className="font-medium">{extractColorFromId(config.pegboardColorId)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-500">Size:</span>
                              <span className="font-medium">{getPegboardSizeDescription(config.length || 'N/A')}</span>
                            </div>
                          </>
                        )}
                        {config.drawersAndCompartments && config.drawersAndCompartments.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Drawers & Compartments:</span>
                            <span className="font-medium">{config.drawersAndCompartments.length} items</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Drawers & Compartments */}
                  {config.drawersAndCompartments && config.drawersAndCompartments.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Drawers & Compartments</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {config.drawersAndCompartments.map((item: string, idx: number) => (
                          <div key={idx} className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300 font-medium">{idx + 1}</Badge>
                              <span className="text-sm font-semibold text-slate-800">{getDrawerDisplayName(item)}</span>
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
                          <div key={idx} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="space-y-3">
                              <div className="border-b border-slate-300 pb-2">
                                <h5 className="font-semibold text-slate-800 text-base">Basin {idx + 1}</h5>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm text-slate-600 block mb-1">Type:</span>
                                  <span className="font-medium text-slate-800">{getBasinTypeDescription(basin.basinType)}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-slate-600 block mb-1">Size:</span>
                                  <span className="font-medium text-slate-800">{getBasinSizeDescription(basin.basinSizePartNumber)}</span>
                                </div>
                                {basin.customDimensions && (
                                  <div className="p-2 bg-amber-50 rounded border border-amber-200">
                                    <span className="text-xs font-medium text-amber-800">Custom Dimensions:</span>
                                    <div className="text-sm text-amber-700 mt-1">
                                      {basin.customDimensions.width}"W × {basin.customDimensions.length}"L × {basin.customDimensions.depth}"D
                                    </div>
                                  </div>
                                )}
                                {basin.addonIds?.length > 0 && (
                                  <div>
                                    <span className="text-sm text-slate-600 block mb-2">Add-ons:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {basin.addonIds.map((addon: string, addonIdx: number) => (
                                        <Badge key={addonIdx} variant="secondary" className="text-xs bg-slate-200 text-slate-700">{addon}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
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
                          <div key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              <div className="text-base font-semibold text-slate-800 mb-2">
                                {getPartDescription(faucet.faucetTypeId)}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600">Quantity:</span>
                                  <Badge variant="secondary" className="bg-blue-200 text-blue-800 font-medium">
                                    {faucet.quantity || 1}
                                  </Badge>
                                </div>
                                {faucet.placement && (
                                  <Badge variant="outline" className="text-xs text-slate-600">
                                    {formatPlacement(faucet.placement)}
                                  </Badge>
                                )}
                              </div>
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
                          <div key={idx} className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              <div className="text-base font-semibold text-slate-800 mb-2">
                                {getPartDescription(sprayer.sprayerTypeId)}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600">Quantity:</span>
                                  <Badge variant="secondary" className="bg-green-200 text-green-800 font-medium">
                                    {sprayer.quantity || 1}
                                  </Badge>
                                </div>
                                {sprayer.location && (
                                  <Badge variant="outline" className="text-xs text-slate-600">
                                    {formatLocation(sprayer.location)}
                                  </Badge>
                                )}
                              </div>
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
                          <div key={idx} className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              {accessory.name && (
                                <div className="text-base font-semibold text-slate-800 mb-2">
                                  {accessory.name}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">Quantity:</span>
                                <Badge variant="secondary" className="bg-purple-200 text-purple-800 font-medium">
                                  {accessory.quantity}
                                </Badge>
                              </div>
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
          ) : (bomPreviewData?.bom || bomPreviewData?.buildBOMs) ? (
            <>

              {/* BOM Display - Single vs Multi-Build */}
              {bomPreviewData.isMultiBuild && bomPreviewData.buildBOMs ? (
                /* Multi-Build Display */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Bill of Materials by Build</h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {Object.keys(bomPreviewData.buildBOMs).length} Build{Object.keys(bomPreviewData.buildBOMs).length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {Object.entries(bomPreviewData.buildBOMs).map(([buildNumber, buildBOM]: [string, any]) => (
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
                          showDebugInfo={false}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Single Build Display */
                <BOMViewer
                  bomItems={bomPreviewData.bom?.hierarchical || bomPreviewData.bom?.flattened || []}
                  orderData={{
                    customerInfo,
                    sinkSelection,
                    configurations,
                    accessories
                  }}
                  customerInfo={customerInfo}
                  showDebugInfo={false}
                />
              )}
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