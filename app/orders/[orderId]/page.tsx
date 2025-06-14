"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Package,
  Download,
  Loader2,
  Edit,
  Eye,
  Printer
} from "lucide-react"
import { format } from "date-fns"
import { BOMViewer } from "@/components/order/BOMViewer"
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard"
import { OrderTimeline } from "@/components/order/OrderTimeline"
import { QCOrderIntegration } from "@/components/qc/QCOrderIntegration"
import { DocumentPreview } from "@/components/ui/document-preview"
import { OrderComments } from "@/components/order/OrderComments"
import { generateOrderDescription, generateShortDescription } from "@/lib/descriptionGenerator"

// Status badge color mapping
const statusColors: Record<string, string> = {
  ORDER_CREATED: "bg-blue-100 text-blue-700",
  PARTS_SENT_WAITING_ARRIVAL: "bg-purple-100 text-purple-700",
  READY_FOR_PRE_QC: "bg-yellow-100 text-yellow-700",
  READY_FOR_PRODUCTION: "bg-orange-100 text-orange-700",
  TESTING_COMPLETE: "bg-green-100 text-green-700",
  PACKAGING_COMPLETE: "bg-teal-100 text-teal-700",
  READY_FOR_FINAL_QC: "bg-indigo-100 text-indigo-700",
  READY_FOR_SHIP: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-gray-100 text-gray-700"
}

// Status display names
const statusDisplayNames: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  PARTS_SENT_WAITING_ARRIVAL: "Parts Sent - Waiting Arrival",
  READY_FOR_PRE_QC: "Ready for Pre-QC",
  READY_FOR_PRODUCTION: "Ready for Production",
  TESTING_COMPLETE: "Testing Complete",
  PACKAGING_COMPLETE: "Packaging Complete",
  READY_FOR_FINAL_QC: "Ready for Final QC",
  READY_FOR_SHIP: "Ready for Ship",
  SHIPPED: "Shipped"
}

// Part/Assembly description mappings
const partDescriptions: Record<string, string> = {
  // Sink Models
  'T2-36': 'T2 CleanStation 36" Standard',
  'T2-48': 'T2 CleanStation 48" Standard',
  'T2-60': 'T2 CleanStation 60" Standard',
  'T2-72': 'T2 CleanStation 72" Standard',
  'T2-84': 'T2 CleanStation 84" Standard',
  'T2-96': 'T2 CleanStation 96" Standard',
  'T2-108': 'T2 CleanStation 108" Standard',
  'T2-120': 'T2 CleanStation 120" Standard',
  
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
  'PERFORATED': 'Perforated Pegboard',
  'STANDARD': 'Standard Pegboard - Basic Configuration',
  'PREMIUM': 'Premium Pegboard - Enhanced Organization',
  'CUSTOM': 'Custom Pegboard - Tailored Layout',
  
  // Pegboard Colors
  'WHITE': 'White Pegboard Finish',
  'GREY': 'Grey Pegboard Finish', 
  'BLACK': 'Black Pegboard Finish',
  
  // Basin Types
  'E_SINK': 'Standard E-Sink Basin',
  'E_SINK_DI': 'E-Sink Basin with Deionized Water',
  'E_DRAIN': 'E-Drain Basin for Drainage',
  
  // Basin Sizes - Exact mappings from ReviewStep
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
  
  // Add-ons
  'T2-ADDON-DRAIN': 'Additional Drain Assembly',
  'T2-ADDON-SOAP': 'Soap Dispenser Assembly',
  
  // REAL CleanStation Accessory Assembly IDs and Descriptions
  
  // Manuals
  'T2-STD-MANUAL-EN-KIT': 'Standard Sink Manual and Preinstall Site Prep in English',
  'T2-STD-MANUAL-FR-KIT': 'Standard Sink Manual and Preinstall Site Prep in French',
  'T2-STD-MANUAL-SP-KIT': 'Standard Sink Manual and Preinstall Site Prep in Spanish',
  
  // Baskets, Bins & Shelves
  'T-OA-BINRAIL-24-KIT': 'Bin Rail, 24" Kit',
  'T-OA-BINRAIL-36-KIT': 'Bin Rail, 36" Kit',
  'T-OA-BINRAIL-48-KIT': 'Bin Rail, 48" Kit',
  'T-OA-PFW1236FM-KIT': 'Wire Basket Kit, Slot Bracket Held, Chrome, 36"W x 12"D with Brackets',
  'T-OA-PFW1218FM-KIT': 'Wire Basket Kit, Slot Bracket Held, Chrome, 18"W x 12"D with Brackets',
  'T-OA-PFW1818FM-KIT': 'Wire Basket Kit, Slot Bracket Held, Chrome, 18"W x 18"D with Brackets',
  'T-OA-SSSHELF-1812': 'Stainless Steel Slot Shelf, 18"W x 12"D',
  'T-OA-SSSHELF-1812-BOLT-ON-KIT': 'Stainless Steel Shelf, 18"W x 12"D Bolt On (for Solid Pegboard)',
  'T-OA-SSSHELF-3612': 'Stainless Steel Slot Shelf, 36"W x 12"D',
  'T-OA-SSSHELF-3612-BOLT-ON-KIT': 'Stainless Steel Slot Shelf, 36"W x 12"D Bolt On (for Solid Pegboard)',
  'T-OA-B110505': 'Blue, 10-7/8" x 5-1/2" x 5" Hanging and Stacking Bin',
  'T-OA-B110807': 'Blue, 10-7/8" x 8-1/8" x 7" Hanging and Stacking Bin',
  'T-OA-B111105': 'Blue, 10-7/8" x 11" x 5" Hanging and Stacking Bin',
  'B210-BLUE': 'Blue Plastic Bin, 5.75"x4.125"x3"',
  'T2-OA-LT-SSSHELF-LRG': 'Stainless Steel Leak Tester Pegboard Shelf, 10"x20", for Large Scope',
  'T2-OA-LT-SSSHELF-SML': 'Stainless Steel Leak Tester Pegboard Shelf, 6"x10", for Small Scope',
  'T-OA-SSSHELF-LGHT-1812-KIT': 'Stainless Steel Slot Shelf with Underlight, 18"W x 12"D Kit',
  'T-OA-SSSHELF-LGHT-3612-KIT': 'Stainless Steel Slot Shelf with Underlight, 36"W x 12"D Kit',
  
  // Holders, Plates & Hangers
  'T-OA-1BRUSH-ORG-PB-KIT': 'Single Brush Holder, Stay-Put Pegboard Mount',
  'T-OA-6BRUSH-ORG-PB-KIT': '6 Brush Organizer, Stay-Put Pegboard Mount',
  'T-OA-WRK-FLW-PB': 'Pegboard Mount Workflow Indicator (Set of 3)',
  'T-OA-PPRACK-2066': 'Stainless Steel Peel Pouch Rack, 20.5 x 6 x 6',
  'T-OA-PB-SS-1L-SHLF': 'One Litre Double Bottle Holder, Stainless Steel',
  'T-OA-PB-SS-2G-SHLF': 'One Gallon Double Detergent Holder, Stainless Steel',
  'T-OA-PB-SS-1GLOVE': 'Single Glove Dispenser, Stainless Steel, 6"W x 11"H',
  'T-OA-PB-SS-2GLOVE': 'Double Glove Dispenser, Stainless Steel, 10"W x 11"H',
  'T-OA-PB-SS-3GLOVE': 'Triple Glove Dispenser, Stainless Steel, 10"W x 17"H',
  'T2-OA-SC-2020-SS': 'Sink Staging Cover for 20x20 Basin, Stainless Steel',
  'T2-OA-SC-2420-SS': 'Sink Staging Cover for 24x20 Basin, Stainless Steel',
  'T2-OA-SC-3020-SS': 'Sink Staging Cover for 30x20 Basin, Stainless Steel',
  
  // Lighting Add-ons
  'T-OA-MLIGHT-PB-KIT': 'Magnifying Light, 5" Lens, Pegboard Mount Kit',
  'T-OA-DIM-MLIGHT-PB-KIT': 'Dimmable Magnifying Light, 5" Lens, Pegboard Mount Kit',
  'T-OA-TASKLIGHT-PB': 'Gooseneck 27" LED Task Light, 10deg Focusing Beam, IP65 Head, 24VDC, PB Mount',
  'T-OA-TASKLIGHT-PB-MAG-KIT': 'Gooseneck LED Task Light with Magnifier, Focusing Beam, PB Mount Kit',
  
  // Electronic & Digital Add-ons
  'T-OA-MNT-ARM': 'Wall Monitor Pivot, Single Monitor Mount',
  'T-OA-MNT-ARM-1EXT': 'Wall Monitor Arm, 1 Extension, Single Monitor Mount',
  'T-OA-MNT-ARM-2EXT': 'Wall Monitor Arm, 2 Extension, Single Monitor Mount',
  'T-OA-KB-MOUSE-ARM': 'Wall Keyboard Arm, Keyboard Mount with Slide-Out Mouse Tray',
  'T-OA-2H-CPUSM': 'CPU Holder, Vertical, Small',
  'T-OA-2H-CPULG': 'CPU Holder, Vertical, Large',
  'T-OA-2H-CPUUV': 'CPU Holder, Tethered, Universal',
  'T-OA-MMA-PB': 'Monitor Mount Arm, Single, PB Mount',
  'T-OA-MMA-DUAL': 'Monitor Mount Adapter, Dual Monitor',
  'T-OA-MMA-LTAB': 'Monitor Mount Adapter, Tablet, Locking',
  'T-OA-MMA-LAP': 'Monitor Mount Adapter, Laptop Tray',
  'T-OA-MNT-SINGLE-COMBO-PB': 'Combo Arm, Keyboard & Monitor Mount for Pegboard (Black)',
  
  // Faucet, Outlet, Drain, Sprayer Kits
  'T2-OA-STD-FAUCET-WB-KIT': '10" Wrist Blade, Swing Spout, Wall Mounted Faucet Kit',
  'T2-OA-PRE-RINSE-FAUCET-KIT': 'Pre-Rinse Overhead Spray Unit Kit',
  'T2-OA-DI-GOOSENECK-FAUCET-KIT': 'Gooseneck Treated Water Faucet Kit, PVC',
  'T2-OA-WATERGUN-TURRET-KIT': 'Water Gun Kit & Turret, Treated Water Compatible',
  'T2-OA-WATERGUN-ROSETTE-KIT': 'Water Gun Kit & Rosette, Treated Water Compatible',
  'T2-OA-AIRGUN-TURRET-KIT': 'Air Gun Kit & Turret',
  'T2-OA-AIRGUN-ROSETTE-KIT': 'Air Gun Kit & Rosette',
  'T2-OA-MS-1026': 'ST24 P-Trap Disinfection Drain Unit',
  'T2-OA-SINK-STRAINER': 'Sink Strainer with Torvan Logo',
  'T2-OA-BASIN-LIGHT-EDR-KIT': 'Basin Light 27W White LED with Push Button',
  'T2-OA-BASIN-LIGHT-ESK-KIT': 'Basin Light 27W White LED (Only Compatible with ESink)',
  'T2-EYEWASH-FAUCET-MNT': 'Eyewash Faucet Attachment S19-200B',
  
  // Drawers & Compartments
  'T2-OA-2D-152012-STACKED-KIT': '15 x 20 x 12 Tall Stacked Two-Drawer Housing with Interior Liner Kit',
  'T2-OA-PO-SHLF-1212': '12"x12" Pull Out Shelf (Only Compatible with HA Shelf)'
}

const getPartDescription = (partId: string): string => {
  return partDescriptions[partId] || partId
}

// Helper functions for display (from ReviewStep)
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
    'COMPARTMENT': 'Compartment',
    'T2-OA-2D-152012-STACKED-KIT': 'Stacked Two-Drawer Storage Module with Liner - 15"W x 20"D x 12"H',
    'T2-OA-2D-152012-STACKED': 'Two-Drawer Housing Base Unit - 15"W x 20"D x 12"H',
    'T2-OA-PO-SHLF-1212': 'Pull-Out Storage Shelf - 12"W x 12"D (Height-Adjustable Compatible)',
    'T2-OA-UHMW-LINER': 'Drawer Interior Liner - UHMW Polyethylene 1/4" Thick'
  }
  return drawerMap[drawerId] || getPartDescription(drawerId)
}

// Helper function to format basin type description
const getBasinTypeDescription = (basinTypeId: string) => {
  const basinTypeMap: { [key: string]: string } = {
    // User-friendly IDs (from UI)
    'E_DRAIN': 'E-Drain Basin Kit with Overflow Protection',
    'E_SINK': 'E-Sink Basin Kit with Automated Dosing',
    'E_SINK_DI': 'E-Sink Kit for DI Water (No Bottom Fill)',
    // Assembly IDs (from database)
    'T2-BSN-EDR-KIT': 'E-Drain Basin Kit with Overflow Protection',
    'T2-BSN-ESK-KIT': 'E-Sink Basin Kit with Automated Dosing',
    'T2-BSN-ESK-DI-KIT': 'E-Sink Kit for DI Water (No Bottom Fill)'
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
// Updated to handle the order details data structure
const generateDisplayModel = (sinkConfig: any, basinConfigs?: any[]) => {
  if (!sinkConfig) return 'N/A'
  
  // In order details, basins are passed separately
  // In review step, they're nested in config.basins
  const basinCount = basinConfigs?.length || sinkConfig.basins?.length || 1
  const length = sinkConfig.length || 48
  const width = sinkConfig.width || 30
  
  const lengthStr = length.toString().padStart(2, '0')
  const widthStr = width.toString().padStart(2, '0')
  const dimensions = lengthStr + widthStr
  
  return `T2-${basinCount}B-${dimensions}HA`
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const user = session?.user
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [bomGenerating, setBomGenerating] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<any>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.orderId])

  const fetchOrderDetails = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${params.orderId}`)
      if (response.data.success) {
        setOrder(response.data.data)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch order details",
        variant: "destructive"
      })
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) return

    setStatusUpdating(true)
    try {
      const response = await nextJsApiClient.put(`/orders/${params.orderId}/status`, {
        newStatus,
        notes: statusNotes
      })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Order status updated successfully"
        })
        setShowStatusModal(false)
        setNewStatus("")
        setStatusNotes("")
        fetchOrderDetails() // Refresh order data
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        variant: "destructive"
      })
    } finally {
      setStatusUpdating(false)
    }
  }

  // Determine allowed status transitions based on user role
  const getAllowedStatuses = () => {
    if (!order || !user) return []
    
    if (user.role === "ADMIN" || user.role === "PRODUCTION_COORDINATOR") {
      // These roles can transition to most statuses
      return Object.keys(statusDisplayNames).filter(status => status !== order.orderStatus)
    }
    
    // Role-specific transitions
    const transitions: Record<string, Record<string, string[]>> = {
      PROCUREMENT_SPECIALIST: {
        ORDER_CREATED: ["PARTS_SENT_WAITING_ARRIVAL"],
        PARTS_SENT_WAITING_ARRIVAL: ["READY_FOR_PRE_QC"]
      },
      QC_PERSON: {
        READY_FOR_PRE_QC: ["READY_FOR_PRODUCTION"],
        READY_FOR_FINAL_QC: ["READY_FOR_SHIP"]
      },
      ASSEMBLER: {
        READY_FOR_PRODUCTION: ["TESTING_COMPLETE"],
        TESTING_COMPLETE: ["PACKAGING_COMPLETE"],
        PACKAGING_COMPLETE: ["READY_FOR_FINAL_QC"]
      }
    }
    
    return transitions[user.role]?.[order.orderStatus] || []
  }

  // Handle BOM export
  const _handleBOMExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await nextJsApiClient.get(
        `/orders/${params.orderId}/bom/export?format=${format}`,
        { 
          responseType: 'blob',
          timeout: 30000 // 30 second timeout for large BOMs
        }
      )

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Extract filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition']
      let filename = `bom_${order.poNumber}_${new Date().toISOString().split('T')[0]}.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `BOM exported as ${format.toUpperCase()} successfully`
      })
    } catch (error: any) {
      console.error('BOM export error:', error)
      toast({
        title: "Export Failed",
        description: error.response?.data?.error || `Failed to export BOM as ${format.toUpperCase()}`,
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg">Order not found</p>
      </div>
    )
  }

  const allowedStatuses = getAllowedStatuses()
  const canUpdateStatus = allowedStatuses.length > 0

  const handleGenerateBOM = async () => {
    setBomGenerating(true)
    try {
      const response = await nextJsApiClient.post(`/orders/${params.orderId}/generate-bom`)
      
      if (response.data.success) {
        toast({
          title: "BOM Generated",
          description: `Bill of Materials generated with ${response.data.data?.itemCount || 0} items`
        })
        fetchOrderDetails() // Refresh order data to show the new BOM
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to generate BOM",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('BOM generation error:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to generate BOM",
        variant: "destructive"
      })
    } finally {
      setBomGenerating(false)
    }
  }

  // Convert order data to description generator format
  const convertOrderForDescription = () => {
    if (!order) return null
    
    const configurations: Record<string, any> = {}
    
    order.buildNumbers.forEach((buildNumber: string) => {
      const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber)
      const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
      const faucetConfigs = order.faucetConfigurations?.filter((fc: any) => fc.buildNumber === buildNumber) || []
      const sprayerConfigs = order.sprayerConfigurations?.filter((sc: any) => sc.buildNumber === buildNumber) || []
      
      if (sinkConfig) {
        configurations[buildNumber] = {
          sinkModelId: sinkConfig.sinkModelId,
          width: sinkConfig.width,
          length: sinkConfig.length,
          legsTypeId: sinkConfig.legsTypeId,
          feetTypeId: sinkConfig.feetTypeId,
          pegboard: sinkConfig.pegboard || false,
          pegboardTypeId: sinkConfig.pegboardTypeId,
          pegboardColorId: sinkConfig.pegboardColorId,
          workflowDirection: sinkConfig.workflowDirection,
          basins: basinConfigs.map((bc: any) => ({
            basinTypeId: bc.basinTypeId,
            basinType: bc.basinTypeId,
            basinSizePartNumber: bc.basinSizePartNumber,
            customWidth: bc.customWidth,
            customLength: bc.customLength,
            customDepth: bc.customDepth,
            addonIds: bc.addonIds || []
          })),
          faucets: faucetConfigs.map((fc: any) => ({
            faucetTypeId: fc.faucetTypeId,
            quantity: fc.faucetQuantity || 1,
            placement: fc.faucetPlacement
          })),
          sprayers: sprayerConfigs.flatMap((sc: any) => 
            sc.sprayerTypeIds?.map((typeId: string, index: number) => ({
              sprayerTypeId: typeId,
              location: sc.sprayerLocations?.[index] || 'Center',
              quantity: 1
            })) || []
          ),
          controlBoxId: sinkConfig.controlBoxId
        }
      }
    })
    
    return {
      sinkSelection: {
        quantity: order.buildNumbers.length,
        buildNumbers: order.buildNumbers
      },
      configurations
    }
  }

  const orderForDescription = convertOrderForDescription()

  // Handle document preview
  const handleDocumentPreview = (doc: any) => {
    setPreviewDocument({
      id: doc.id,
      filename: doc.docName,
      originalName: doc.docName,
      mimeType: doc.mimeType || 'application/octet-stream',
      size: doc.fileSize || 0,
      uploadedAt: doc.timestamp,
      uploadedBy: doc.uploadedBy || 'Unknown',
      category: doc.docType
    })
    setPreviewModalOpen(true)
  }

  // Handle document download
  const handleDocumentDownload = (doc: any) => {
    // Use the legacy upload system URL pattern
    const downloadUrl = doc.docURL || `/uploads/documents/${doc.docName}`
    window.open(downloadUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between py-3 border-b">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Order Details</h1>
            <p className="text-sm text-slate-600">PO: {order.poNumber}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[order.orderStatus] || "bg-gray-100 text-gray-700"}>
            {statusDisplayNames[order.orderStatus] || order.orderStatus}
          </Badge>
          <Button 
            onClick={() => router.push(`/orders/${params.orderId}/print`)}
            variant="outline"
            size="sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          <TabsTrigger value="qc">Quality Control</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
                    <span className="font-medium">{order.customerName}</span>
                  </div>
                  {order.projectName && (
                    <div>
                      <span className="text-slate-500 block">Project</span>
                      <span className="font-medium">{order.projectName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Sales Person</span>
                    <span className="font-medium">{order.salesPerson}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Language</span>
                    <span className="font-medium">
                      {order.language === "EN" ? "English" : 
                       order.language === "FR" ? "French" : "Spanish"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 border-b pb-1">Order Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500 block">PO Number</span>
                    <span className="font-medium">{order.poNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{order.buildNumbers.length === 1 ? 'Build & Model' : 'Sink Models'}</span>
                    {order.buildNumbers.length === 1 ? (
                      <div className="text-sm">
                        {(() => {
                          const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === order.buildNumbers[0])
                          const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === order.buildNumbers[0]) || []
                          if (!sinkConfig) return <span className="font-medium">{order.buildNumbers[0]}: N/A</span>
                          
                          const basinCount = basinConfigs.length || 1
                          const length = sinkConfig.length || 48
                          const width = sinkConfig.width || 30
                          const lengthStr = length.toString().padStart(2, '0')
                          const widthStr = width.toString().padStart(2, '0')
                          const dimensions = lengthStr + widthStr
                          const sinkModel = `T2-${basinCount}B-${dimensions}HA`
                          
                          return <span className="font-medium">{order.buildNumbers[0]}: {sinkModel}</span>
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {order.buildNumbers.map((buildNumber: string) => {
                          const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber)
                          if (!sinkConfig) return null
                          
                          // Generate sink model for this specific build
                          const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
                          const basinCount = basinConfigs.length || 1
                          const length = sinkConfig.length || 48
                          const width = sinkConfig.width || 30
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
                    <span className="text-slate-500 block">Created</span>
                    <span className="font-medium">{format(new Date(order.createdAt), "MMM dd, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Want Date</span>
                    <span className="font-medium">{format(new Date(order.wantDate), "MMM dd, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Created By</span>
                    <span className="font-medium">{order.createdBy.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Quantity</span>
                    <span className="font-medium">{order.buildNumbers.length} Unit{order.buildNumbers.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 border-b pb-1">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500 block">Current Status</span>
                    <Badge className={statusColors[order.orderStatus] || "bg-gray-100 text-gray-700"}>
                      {statusDisplayNames[order.orderStatus] || order.orderStatus}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Configurations</span>
                    <span className="font-medium">{order.buildNumbers.length} build{order.buildNumbers.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Accessories</span>
                    <span className="font-medium">{order.selectedAccessories?.length || 0} item{(order.selectedAccessories?.length || 0) !== 1 ? 's' : ''}</span>
                  </div>
                  {order.associatedDocuments && order.associatedDocuments.length > 0 && (
                    <div>
                      <span className="text-slate-500 block">Documents</span>
                      <span className="font-medium">{order.associatedDocuments.length} file{order.associatedDocuments.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Build-Specific Summaries */}
          {order.buildNumbers.length === 1 ? (
            /* Single Build - Show unified description */
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
                <CardDescription>Detailed specification of the configured sink</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Short Description */}
                  {orderForDescription && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
                      <p className="text-blue-800">
                        {generateShortDescription(orderForDescription)}
                      </p>
                    </div>
                  )}
                  
                  {/* Full Description */}
                  {orderForDescription && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-3">Complete Specification</h4>
                      <p className="text-slate-700 leading-relaxed text-sm capitalize">
                        {generateOrderDescription(orderForDescription)?.toLowerCase()}
                      </p>
                    </div>
                  )}
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
                  {order.buildNumbers.map((buildNumber: string) => {
                    const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber)
                    const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
                    const buildAccessories = order.selectedAccessories?.filter((sa: any) => sa.buildNumber === buildNumber) || []
                    
                    if (!sinkConfig) return null
                    
                    return (
                      <div key={buildNumber} className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">{buildNumber}</h4>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">{buildNumber}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 block">Sink Model</span>
                            <span className="font-medium">{getPartDescription(sinkConfig.sinkModelId) || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Dimensions</span>
                            <span className="font-medium">{sinkConfig.width}" × {sinkConfig.length}"</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Legs/Feet</span>
                            <span className="font-medium">{getPartDescription(sinkConfig.legsTypeId || '') || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Pegboard</span>
                            <span className="font-medium">
                              {sinkConfig.pegboard ? 
                                `${getPartDescription(sinkConfig.pegboardTypeId || '')} - ${extractColorFromId(sinkConfig.pegboardColorId || '')}` : 
                                'No'
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Basins</span>
                            <span className="font-medium">{basinConfigs.length} basin{basinConfigs.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Accessories</span>
                            <span className="font-medium">{buildAccessories.length} item{buildAccessories.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        
                        {basinConfigs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <span className="text-slate-500 text-xs block mb-2">Basin Configuration:</span>
                            <div className="flex flex-wrap gap-2">
                              {basinConfigs.map((basin: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {getPartDescription(basin.basinTypeId)} ({getPartDescription(basin.basinSizePartNumber)})
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

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Update */}
          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Change the order status based on current progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>New Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {statusDisplayNames[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Add notes about this status change..."
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || statusUpdating}
                  >
                    {statusUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          {order.buildNumbers.map((buildNumber: string) => {
            // Get sink configuration for this build number
            const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber) || {}
            const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
            const faucetConfigs = order.faucetConfigurations?.filter((fc: any) => fc.buildNumber === buildNumber) || []
            const sprayerConfigs = order.sprayerConfigurations?.filter((sc: any) => sc.buildNumber === buildNumber) || []
            const accessories = order.selectedAccessories?.filter((sa: any) => sa.buildNumber === buildNumber) || []

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
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Sink Body</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Model:</span>
                          <span className="font-medium">{generateDisplayModel(sinkConfig, basinConfigs)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Width:</span>
                          <span className="font-medium">{sinkConfig.width || 'N/A'} inches</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Length:</span>
                          <span className="font-medium">{sinkConfig.length || 'N/A'} inches</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Workflow Direction:</span>
                          <span className="font-medium">{formatWorkflowDirection(sinkConfig.workflowDirection || '')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Legs:</span>
                          <span className="font-medium">{getPartDescription(sinkConfig.legsTypeId) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Feet:</span>
                          <span className="font-medium">{getPartDescription(sinkConfig.feetTypeId) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Pegboard & Storage</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Has Pegboard:</span>
                          <span className="font-medium">{sinkConfig.pegboard ? 'Yes' : 'No'}</span>
                        </div>
                        {sinkConfig.pegboard && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Pegboard Type:</span>
                              <span className="font-medium">{getPegboardTypeDescription(sinkConfig.pegboardTypeId) || 'N/A'}</span>
                            </div>
                            {sinkConfig.pegboardColorId && extractColorFromId(sinkConfig.pegboardColorId) !== 'N/A' && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Pegboard Color:</span>
                                <span className="font-medium">{extractColorFromId(sinkConfig.pegboardColorId)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-500">Size:</span>
                              <span className="font-medium">{getPegboardSizeDescription(sinkConfig.length || 'N/A')}</span>
                            </div>
                          </>
                        )}
                        {sinkConfig.drawersAndCompartments && sinkConfig.drawersAndCompartments.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Drawers & Compartments:</span>
                            <span className="font-medium">{sinkConfig.drawersAndCompartments.length} items</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Drawers & Compartments */}
                  {sinkConfig.drawersAndCompartments && sinkConfig.drawersAndCompartments.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Drawers & Compartments</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sinkConfig.drawersAndCompartments.map((item: string, idx: number) => (
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
                  {basinConfigs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Basin Configurations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {basinConfigs.map((basin: any, idx: number) => (
                          <div key={idx} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="space-y-3">
                              <div className="border-b border-slate-300 pb-2">
                                <h5 className="font-semibold text-slate-800 text-base">Basin {idx + 1}</h5>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm text-slate-600 block mb-1">Type:</span>
                                  <span className="font-medium text-slate-800">{getBasinTypeDescription(basin.basinTypeId)}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-slate-600 block mb-1">Size:</span>
                                  <span className="font-medium text-slate-800">{getBasinSizeDescription(basin.basinSizePartNumber)}</span>
                                </div>
                                {(basin.customWidth || basin.customLength || basin.customDepth) && (
                                  <div className="p-2 bg-amber-50 rounded border border-amber-200">
                                    <span className="text-xs font-medium text-amber-800">Custom Dimensions:</span>
                                    <div className="text-sm text-amber-700 mt-1">
                                      {basin.customWidth && `${basin.customWidth}"W`}
                                      {basin.customLength && ` × ${basin.customLength}"L`}
                                      {basin.customDepth && ` × ${basin.customDepth}"D`}
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
                  {faucetConfigs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Faucet Configurations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {faucetConfigs.map((faucet: any, idx: number) => (
                          <div key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              <div className="text-base font-semibold text-slate-800 mb-2">
                                {getPartDescription(faucet.faucetTypeId)}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600">Quantity:</span>
                                  <Badge variant="secondary" className="bg-blue-200 text-blue-800 font-medium">
                                    {faucet.faucetQuantity}
                                  </Badge>
                                </div>
                                {faucet.faucetPlacement && (
                                  <Badge variant="outline" className="text-xs text-slate-600">
                                    {formatPlacement(faucet.faucetPlacement)}
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
                  {sprayerConfigs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Sprayer Configurations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sprayerConfigs.map((sprayer: any, idx: number) => (
                          <div key={idx} className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              {sprayer.sprayerTypeIds?.length > 0 ? (
                                <>
                                  <div className="text-base font-semibold text-slate-800 mb-2">
                                    {sprayer.sprayerTypeIds.map((type: string, typeIdx: number) => getPartDescription(type)).join(', ')}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-slate-600">Quantity:</span>
                                      <Badge variant="secondary" className="bg-green-200 text-green-800 font-medium">
                                        {sprayer.sprayerQuantity || 1}
                                      </Badge>
                                    </div>
                                    {sprayer.sprayerLocation && (
                                      <Badge variant="outline" className="text-xs text-slate-600">
                                        {formatLocation(sprayer.sprayerLocation)}
                                      </Badge>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="text-base font-semibold text-slate-600">
                                  No sprayer configured
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accessories */}
                  {accessories.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-700 border-b pb-1">Selected Accessories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {accessories.map((accessory: any, idx: number) => (
                          <div key={idx} className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              <div className="text-base font-semibold text-slate-800 mb-2">
                                {getPartDescription(accessory.assemblyId)}
                              </div>
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


          
          {(order.generatedBoms || order.boms) && (order.generatedBoms || order.boms).length > 0 ? (
            <>
              {(() => {
                const bomData = order.generatedBoms?.[0] || order.boms?.[0]
                const bomItems = bomData?.bomItems || []
                
                // Check if this is multi-build by examining if there are build-specific BOMs
                const isMultiBuild = order.buildNumbers.length > 1
                const buildBOMs: Record<string, any> = {}
                
                if (isMultiBuild) {
                  // Group BOM items by build number if available
                  order.buildNumbers.forEach(buildNumber => {
                    const buildSpecificItems = bomItems.filter((item: any) => 
                      item.buildNumber === buildNumber || 
                      item.source?.includes(buildNumber) ||
                      !item.buildNumber // Include shared items
                    )
                    buildBOMs[buildNumber] = {
                      hierarchical: buildSpecificItems,
                      flattened: buildSpecificItems,
                      totalItems: buildSpecificItems.length
                    }
                  })
                }
                
                // Calculate summary statistics from hierarchical structure
                const calculateHierarchicalStats = (items: any[]): { total: number; system: number; structural: number; accessories: number } => {
                  let total = 0
                  let system = 0
                  let structural = 0
                  let accessories = 0
                  
                  const processItem = (item: any) => {
                    total++
                    
                    // Categorize based on type and category
                    if (item.category?.includes('SYSTEM') || item.itemType?.includes('SYSTEM')) {
                      system++
                    } else if (item.category?.includes('STRUCTURAL') || item.itemType?.includes('STRUCTURAL') ||
                               item.category?.includes('LEGS') || item.category?.includes('SUPPORT')) {
                      structural++
                    } else if (item.category?.includes('ACCESSORY') || item.itemType?.includes('ACCESSORY')) {
                      accessories++
                    }
                    
                    // Process children recursively
                    if (item.children && item.children.length > 0) {
                      item.children.forEach(processItem)
                    }
                  }
                  
                  items.forEach(processItem)
                  return { total, system, structural, accessories }
                }
                
                const stats = calculateHierarchicalStats(bomItems)
                const systemComponents = stats.system
                const structuralComponents = stats.structural  
                const accessoryComponents = stats.accessories
                
                return (
                  <>

                    {/* BOM Display - Single vs Multi-Build */}
                    {isMultiBuild && Object.keys(buildBOMs).length > 0 ? (
                      /* Multi-Build Display */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Bill of Materials by Build</h3>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {Object.keys(buildBOMs).length} Build{Object.keys(buildBOMs).length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {Object.entries(buildBOMs).map(([buildNumber, buildBOM]: [string, any]) => {
                          // Get order data for this specific build
                          const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber)
                          const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
                          const faucetConfigs = order.faucetConfigurations?.filter((fc: any) => fc.buildNumber === buildNumber) || []
                          const sprayerConfigs = order.sprayerConfigurations?.filter((sc: any) => sc.buildNumber === buildNumber) || []
                          const buildAccessories = order.selectedAccessories?.filter((sa: any) => sa.buildNumber === buildNumber) || []
                          
                          const orderData = {
                            customerInfo: {
                              customerName: order.customerName,
                              poNumber: order.poNumber,
                              projectName: order.projectName,
                              salesPerson: order.salesPerson,
                              language: order.language,
                              wantDate: order.wantDate,
                              notes: order.notes
                            },
                            sinkSelection: {
                              quantity: 1,
                              buildNumbers: [buildNumber]
                            },
                            configurations: sinkConfig ? {
                              [buildNumber]: {
                                ...sinkConfig,
                                basins: basinConfigs,
                                faucets: faucetConfigs,
                                sprayers: sprayerConfigs
                              }
                            } : {},
                            accessories: {
                              [buildNumber]: buildAccessories
                            }
                          }
                          
                          return (
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
                                  orderId={order.id}
                                  poNumber={order.poNumber}
                                  bomItems={buildBOM?.hierarchical || buildBOM?.flattened || []}
                                  orderData={orderData}
                                  customerInfo={orderData.customerInfo}
                                  showDebugInfo={false}
                                />
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      /* Single Build Display */
                      <BOMViewer
                        orderId={order.id}
                        poNumber={order.poNumber}
                        bomItems={bomItems}
                        orderData={orderForDescription}
                        customerInfo={{
                          customerName: order.customerName,
                          poNumber: order.poNumber,
                          projectName: order.projectName,
                          salesPerson: order.salesPerson,
                          language: order.language,
                          wantDate: order.wantDate,
                          notes: order.notes
                        }}
                        showDebugInfo={false}
                      />
                    )}
                  </>
                )
              })()}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">No BOM generated for this order</p>
                <p className="text-sm text-slate-500 mb-4">
                  Generate the Bill of Materials to see all required parts and assemblies.
                </p>
                <Button 
                  onClick={handleGenerateBOM} 
                  disabled={bomGenerating}
                  className="min-w-[150px]"
                >
                  {bomGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {bomGenerating ? 'Generating...' : 'Generate BOM'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* QC Tab */}
        <TabsContent value="qc" className="space-y-4">
          <QCOrderIntegration orderId={order.id} orderStatus={order.orderStatus} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {order.associatedDocuments && order.associatedDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.associatedDocuments.map((doc: any) => (
                <Card key={doc.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <p className="font-medium">{doc.docName}</p>
                        </div>
                        <p className="text-sm text-slate-500">
                          Uploaded on {format(new Date(doc.timestamp), "MMM dd, yyyy")}
                        </p>
                        <Badge variant="outline">{doc.docType}</Badge>
                        {doc.fileSize && (
                          <p className="text-xs text-slate-400">
                            {(doc.fileSize / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDocumentPreview(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDocumentDownload(doc)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No documents uploaded for this order</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <OrderComments orderId={order.id} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <OrderTimeline
            events={order.historyLogs}
            currentStatus={order.orderStatus}
          />
        </TabsContent>
      </Tabs>

      {/* Document Preview Modal */}
      <DocumentPreview
        file={previewDocument}
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        downloadUrl={previewDocument?.id ? `/uploads/documents/${previewDocument.filename}` : undefined}
        onDownload={() => {
          if (previewDocument) {
            handleDocumentDownload(previewDocument)
          }
        }}
      />
    </div>
  )
}

