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
  Edit,
  Copy,
  Download,
  FileDown
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { BOMViewer } from "./BOMViewer"
import { format } from "date-fns"
import { generateOrderDescription, generateShortDescription, generateSinkModel } from "@/lib/descriptionGenerator"
import { ConfigurationDisplay } from "./shared/ConfigurationDisplay"
import { BOMDisplay } from "./shared/BOMDisplay"
import { 
  getEnhancedBasinDescription, 
  formatAccessoriesDisplay, 
  formatDocumentsDisplay 
} from "@/lib/utils"

// Part/Assembly description mappings
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
  'T2-LEVELING-CASTOR-475': 'Lock & Leveling Casters',
  'T2-SEISMIC-FEET': 'S.S Adjustable Seismic Feet',
  
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
  'T2-OA-AIRGUN-ROSETTE-KIT': 'Air Gun Kit & Rosette'
}

const getPartDescription = (partId: string): string => {
  return partDescriptions[partId] || partId
}

// Helper function for color extraction
const extractColorFromId = (colorId: string) => {
  if (!colorId) return 'None'
  const colorMap: { [key: string]: string } = {
    'T-OA-PB-COLOR-GREEN': 'Green',
    'T-OA-PB-COLOR-BLUE': 'Blue', 
    'T-OA-PB-COLOR-RED': 'Red',
    'T-OA-PB-COLOR-BLACK': 'Black',
    'T-OA-PB-COLOR-YELLOW': 'Yellow',
    'T-OA-PB-COLOR-GREY': 'Grey',
    'T-OA-PB-COLOR-WHITE': 'White',
    'T-OA-PB-COLOR-ORANGE': 'Orange'
  }
  return colorMap[colorId] || colorId
}

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
  const [exportingPDF, setExportingPDF] = useState(false)

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

  const handleExportPDF = async () => {
    if (!customerInfo.poNumber) {
      alert('Cannot export PDF: PO Number is required')
      return
    }

    setExportingPDF(true)
    try {
      // Dynamically import PDF utilities to avoid build-time import issues
      const { downloadBOMPDF, aggregateBOMItems, sortBOMItemsByPriority } = await import('@/lib/pdfExport.client')
      
      if (isEditMode && orderId) {
        // For saved orders, get data from API and generate PDF client-side
        const response = await nextJsApiClient.get(`/orders/${orderId}/bom-export`, {
          params: { format: 'pdf' }
        })

        if (response.data.success && response.data.data) {
          await downloadBOMPDF(
            response.data.data.bomItems,
            response.data.data.orderInfo
          )
        } else {
          throw new Error('Failed to get BOM data from API')
        }
      } else {
        // For preview mode, generate PDF client-side from preview data
        if (!bomPreviewData || !bomPreviewData.bom) {
          alert('No BOM data available. Please generate BOM preview first.')
          return
        }

        // Extract BOM items from preview data
        const bomItems: any[] = bomPreviewData.bom.flattened || bomPreviewData.bom.hierarchical || []
        
        if (bomItems.length === 0) {
          alert('No BOM items found to export.')
          return
        }

        // Convert to our BOMItem format
        const convertedItems: any[] = bomItems.map(item => ({
          partNumber: item.assemblyId || item.partNumber || item.id,
          name: item.name,
          description: item.description || item.name,
          quantity: item.quantity,
          category: item.category || item.itemType || 'UNCATEGORIZED',
          itemType: item.itemType
        }))

        // Prepare order info
        const orderInfo: any = {
          poNumber: customerInfo.poNumber,
          customerName: customerInfo.customerName,
          orderDate: new Date(),
          wantDate: customerInfo.wantDate || undefined,
          projectName: customerInfo.projectName || undefined,
          salesPerson: customerInfo.salesPerson || undefined,
          buildNumbers: sinkSelection.buildNumbers
        }

        // Aggregate and download PDF
        const aggregatedItems = sortBOMItemsByPriority(aggregateBOMItems(convertedItems))
        await downloadBOMPDF(aggregatedItems, orderInfo)
      }
    } catch (error: any) {
      console.error('PDF export error:', error)
      if (isEditMode) {
        alert('Failed to export PDF from saved order.')
      } else {
        alert('Failed to export PDF from preview data.')
      }
    } finally {
      setExportingPDF(false)
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
      } else if (error.response?.status === 403) {
        console.error('🚨 403 Forbidden error:', error.response?.data)
        
        // Handle authorization errors
        const errorMessage = error.response?.data?.message || 'Access denied - insufficient permissions'
        setSubmitError(`Permission denied (403): ${errorMessage}`)
      } else {
        console.error('🚨 Non-validation error:', error.response?.data)
        console.error('🚨 Full error object:', error)
        setSubmitError(error.response?.data?.message || 'An unexpected error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate comprehensive JSON for debugging/inspection
  const generateOrderJSON = () => {
    return {
      order: {
        id: orderId || `temp_${Date.now()}`,
        orderNumber: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: isEditMode ? "DRAFT_UPDATED" : "DRAFT",
        
        customerInfo: {
          customerName: customerInfo.customerName,
          poNumber: customerInfo.poNumber,
          projectName: customerInfo.projectName,
          salesPerson: customerInfo.salesPerson,
          wantDate: customerInfo.wantDate,
          language: customerInfo.language,
          notes: customerInfo.notes,
          poDocuments: customerInfo.poDocuments?.map((doc, index) => ({
            id: `doc_${index}`,
            fileName: doc.name,
            fileSize: doc.size,
            fileType: doc.type,
            uploadedAt: new Date().toISOString()
          })) || [],
          sinkDrawings: customerInfo.sinkDrawings?.map((doc, index) => ({
            id: `drawing_${index}`,
            fileName: doc.name,
            fileSize: doc.size,
            fileType: doc.type,
            uploadedAt: new Date().toISOString()
          })) || []
        },
        
        sinkSelection: {
          sinkFamily: sinkSelection.sinkFamily || "MDRD",
          sinkModelId: sinkSelection.sinkModelId,
          sinkModelName: sinkSelection.sinkModelId === "T2-B1" ? "Single Basin CleanStation" :
                         sinkSelection.sinkModelId === "T2-B2" ? "Dual Basin CleanStation" :
                         sinkSelection.sinkModelId === "T2-B3" ? "Triple Basin CleanStation" : "Unknown",
          quantity: sinkSelection.quantity,
          buildNumbers: sinkSelection.buildNumbers
        },
        
        sinkConfigurations: sinkSelection.buildNumbers.map(buildNumber => {
          const config = configurations[buildNumber]
          if (!config) return null
          
          return {
            buildNumber,
            sinkModelId: config.sinkModelId,
            width: config.width,
            length: config.length,
            workflowDirection: config.workflowDirection || "LEFT_TO_RIGHT",
            
            structuralComponents: {
              legsTypeId: config.legsTypeId,
              legsTypeName: "Height Adjustable Legs", // You could map this from actual data
              feetTypeId: config.feetTypeId,
              feetTypeName: "Leveling Casters" // You could map this from actual data
            },
            
            pegboardConfiguration: config.pegboard ? {
              pegboard: config.pegboard,
              pegboardTypeId: config.pegboardTypeId,
              pegboardColorId: config.pegboardColorId,
              pegboardColorName: "Color-safe+ Option"
            } : { pegboard: false },
            
            drawersAndCompartments: config.drawersAndCompartments?.map(drawer => ({
              id: drawer,
              name: drawer,
              quantity: 1
            })) || [],
            
            basins: config.basins?.map((basin, index) => ({
              position: index + 1,
              basinTypeId: basin.basinTypeId,
              basinType: basin.basinType,
              basinSizePartNumber: basin.basinSizePartNumber,
              basinSizeName: basin.basinSizePartNumber,
              customWidth: basin.customWidth,
              customLength: basin.customLength,
              customDepth: basin.customDepth,
              addonIds: basin.addonIds || [],
              addons: basin.addonIds?.map(addonId => ({
                id: addonId,
                name: addonId,
                quantity: 1
              })) || []
            })) || [],
            
            faucets: config.faucets?.map((faucet, index) => ({
              id: `faucet_${index}`,
              faucetTypeId: faucet.faucetTypeId,
              faucetTypeName: faucet.faucetTypeId,
              placement: faucet.placement,
              quantity: faucet.quantity || 1
            })) || [],
            
            sprayers: config.sprayers?.map((sprayer, index) => ({
              id: `sprayer_${index}`,
              sprayerTypeId: sprayer.sprayerTypeId,
              sprayerTypeName: sprayer.sprayerTypeId,
              location: sprayer.location
            })) || [],
            
            controlBoxId: autoControlBoxes[buildNumber]?.controlBoxId || "AUTO_DETERMINED",
            controlBoxName: autoControlBoxes[buildNumber]?.name || "Auto-determined Control Box"
          }
        }).filter(Boolean),
        
        accessories: Object.entries(accessories).flatMap(([buildNumber, buildAccessories]) => 
          (buildAccessories as SelectedAccessory[]).map(accessory => ({
            assemblyId: accessory.assemblyId,
            accessoryId: accessory.accessoryId,
            name: accessory.name,
            partNumber: accessory.partNumber,
            quantity: accessory.quantity,
            buildNumbers: accessory.buildNumbers,
            category: "ACCESSORY"
          }))
        ),
        
        bomPreview: bomPreviewData || null,
        
        autoControlBoxes,
        
        validation: {
          status: "PENDING",
          messages: [],
          businessRules: {
            sinkLengthValid: true,
            basinCountMatches: true,
            faucetPlacementValid: true,
            uniqueBuildNumbers: true,
            requiredFieldsComplete: true
          }
        },
        
        metadata: {
          isEditMode,
          orderId,
          generatedAt: new Date().toISOString(),
          totalAccessoriesCount,
          systemVersion: "1.0.0"
        }
      }
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          <TabsTrigger value="json" className="bg-yellow-100 text-yellow-800">🔍 JSON Debug</TabsTrigger>
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
            onExportPDF={handleExportPDF}
            exportingPDF={exportingPDF}
            orderId={orderId}
            isEditMode={isEditMode}
          />
        </TabsContent>

        {/* JSON Debug Tab - TEMPORARY FOR INSPECTION */}
        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                JSON Debug Inspector
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  Temporary - Development Only
                </Badge>
              </CardTitle>
              <CardDescription>
                Complete order data structure for inspection and debugging purposes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const jsonData = generateOrderJSON();
                    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
                    // You could add a toast notification here
                    alert('JSON copied to clipboard!');
                  }}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const jsonData = generateOrderJSON();
                    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `order-debug-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download JSON
                </Button>
              </div>
              
              <div className="border rounded-lg p-4 bg-slate-50">
                <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(generateOrderJSON(), null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
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