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
import { ConfigurationDisplay } from "./shared/ConfigurationDisplay"
import { BOMDisplay } from "./shared/BOMDisplay"

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
        customerInfo: {
          ...customerInfo,
          wantDate: customerInfo.wantDate ? (
            customerInfo.wantDate instanceof Date 
              ? customerInfo.wantDate.toISOString() 
              : new Date(customerInfo.wantDate).toISOString()
          ) : null
        },
        sinkSelection,
        configurations,
        accessories
      }

      const response = await nextJsApiClient.post('orders/preview-bom', requestBody)
      
      if (response.data.success) {
        console.log('ReviewStep BOM data received:', response.data)
        
        // Process BOM data
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

    console.log('🔍 Validating order data...')
    console.log('🔍 Customer Info structure:', customerInfo)
    console.log('🔍 Sink Selection structure:', sinkSelection)

    // Validate customer info
    if (!customerInfo.poNumber || customerInfo.poNumber.length < 1) {
      errors.push('Customer Info: PO Number is required');
    }
    if (!customerInfo.customerName || customerInfo.customerName.length < 1) {
      errors.push('Customer Info: Customer Name is required');
    }
    if (!customerInfo.salesPerson || customerInfo.salesPerson.length < 1) {
      errors.push('Customer Info: Sales Person is required');
    }
    if (!customerInfo.wantDate) {
      errors.push('Customer Info: Want Date is required');
    } else if (!(customerInfo.wantDate instanceof Date) && !Date.parse(customerInfo.wantDate as any)) {
      errors.push('Customer Info: Want Date must be a valid date');
    }

    // Validate sink selection
    if (!sinkSelection.buildNumbers || sinkSelection.buildNumbers.length === 0) {
      errors.push('Sink Selection: Build numbers are required');
    }
    if (!sinkSelection.quantity || sinkSelection.quantity < 1) {
      errors.push('Sink Selection: Quantity must be at least 1');
    }

    // Check if all build numbers have configurations
    const missingConfigurations = sinkSelection.buildNumbers.filter(
      buildNumber => !configurations[buildNumber]
    );
    if (missingConfigurations.length > 0) {
      errors.push(`Missing configurations for build numbers: ${missingConfigurations.join(', ')}`);
    }

    // Validate each configuration
    Object.entries(configurations).forEach(([buildNumber, config]) => {
      console.log(`🔍 Validating config for ${buildNumber}:`, config)
      
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
      } else {
        config.basins.forEach((basin, idx) => {
          console.log(`🔍 Basin ${idx + 1} structure:`, basin)
          if (!basin.basinType && !basin.basinTypeId) {
            errors.push(`Build ${buildNumber} Basin ${idx + 1}: Basin type is required`);
          }
          if (!basin.basinSizePartNumber) {
            errors.push(`Build ${buildNumber} Basin ${idx + 1}: Basin size is required`);
          }
        })
      }

      // Check legs and feet
      if (!config.legsTypeId) {
        errors.push(`Build ${buildNumber}: Legs type is required`);
      }
      if (!config.feetTypeId) {
        errors.push(`Build ${buildNumber}: Feet type is required`);
      }
    });

    console.log('🔍 Validation complete. Errors found:', errors.length)
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
      
      // Ensure date is properly formatted and all required fields are present
      const requestBody = {
        customerInfo: {
          ...customerInfo,
          wantDate: customerInfo.wantDate ? (
            customerInfo.wantDate instanceof Date 
              ? customerInfo.wantDate.toISOString() 
              : new Date(customerInfo.wantDate).toISOString()
          ) : null
        },
        sinkSelection,
        configurations,
        accessories
      }

      // Enhanced logging for debugging validation issues
      console.log('🔍 Order submission request body:', JSON.stringify(requestBody, null, 2))
      console.log('🔍 Customer Info:', customerInfo)
      console.log('🔍 Sink Selection:', sinkSelection)
      console.log('🔍 Configurations:', configurations)
      console.log('🔍 Accessories:', accessories)

      const response = await nextJsApiClient[method](endpoint, requestBody)

      if (response.data.success) {
        const createdOrderId = response.data.orderId || orderId
        
        if (!createdOrderId) {
          console.error('No order ID returned from order creation')
          setSubmitError('Order was created but no ID was returned')
          return
        }
        
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
                  console.error(`PO document ${index + 1} upload error:`, fileUploadError.message || 'Unknown error')
                  if (fileUploadError.response?.data) {
                    console.error(`PO document ${index + 1} upload error response:`, fileUploadError.response.data)
                  }
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
                  console.error(`Sink drawing ${index + 1} upload error:`, fileUploadError.message || 'Unknown error')
                  if (fileUploadError.response?.data) {
                    console.error(`Sink drawing ${index + 1} upload error response:`, fileUploadError.response.data)
                  }
                }
              }
              uploadPromises.push(uploadSinkDrawing())
            }
          })
        }
        
        // Execute all uploads in parallel
        if (uploadPromises.length > 0) {
          try {
            const uploadResults = await Promise.allSettled(uploadPromises)
            
            // Log results
            const successful = uploadResults.filter(r => r.status === 'fulfilled').length
            const failed = uploadResults.filter(r => r.status === 'rejected').length
            
            console.log(`File uploads completed: ${successful} successful, ${failed} failed`)
            
            // Log any failures for debugging
            uploadResults.forEach((result, index) => {
              if (result.status === 'rejected') {
                console.warn(`Upload ${index + 1} failed:`, result.reason?.message || 'Unknown reason')
              }
            })
          } catch (error: any) {
            console.error('Error during file uploads:', error?.message || 'Unknown error')
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
      console.error('Order submission error:', error?.message || error?.toString() || 'Unknown error')
      if (error?.response?.data) {
        console.error('Error response:', error.response.data)
      }
      
      // Enhanced error information extraction
      if (error.response?.data?.errors) {
        console.error('🚨 Zod Validation errors:', error.response.data.errors)
        
        // Create detailed error messages for user
        const errorMessages = error.response.data.errors.map((err: any) => {
          const fieldPath = err.path?.join('.') || 'unknown field'
          const message = err.message || 'Invalid value'
          console.error(`❌ Field: ${fieldPath}, Error: ${message}`)
          return `${fieldPath}: ${message}`
        }).join('\n• ')
        
        setSubmitError(`Validation failed:\n• ${errorMessages}`)
      } else if (error.response?.status === 400) {
        console.error('🚨 400 Bad Request error:', error.response?.data)
        console.error('🚨 Full error response:', error.response)
        
        // Provide more specific error handling for 400 errors
        const errorMessage = error.response?.data?.message || 'Bad request - please check all required fields are filled correctly'
        setSubmitError(`Request failed (400): ${errorMessage}`)
      } else {
        console.error('🚨 Non-validation error:', error.response?.data)
        console.error('🚨 Full error object:', error)
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
                            <span className="font-medium">{config.width}″ × {config.length}″</span>
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
          <ConfigurationDisplay
            buildNumbers={sinkSelection.buildNumbers}
            configurations={configurations}
            accessories={accessories}
            autoControlBoxes={autoControlBoxes}
          />
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom" className="space-y-3">
          <BOMDisplay
            bomData={bomPreviewData}
            isLoading={bomPreviewLoading}
            error={bomPreviewError}
            onRetry={previewBOM}
            customerInfo={customerInfo}
            sinkSelection={sinkSelection}
            configurations={configurations}
            accessories={accessories}
            showDebugInfo={false}
          />
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
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Order Submission Failed:</div>
                      <pre className="text-xs whitespace-pre-wrap">{submitError}</pre>
                    </div>
                  </AlertDescription>
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