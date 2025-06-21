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
import { ConfigurationDisplay } from "@/components/order/shared/ConfigurationDisplay"
import { BOMDisplay } from "@/components/order/shared/BOMDisplay"
import { ProcurementTab } from "@/components/order/tabs/ProcurementTab"
import { 
  getEnhancedBasinDescription, 
  formatAccessoriesDisplay, 
  formatDocumentsDisplay 
} from "@/lib/utils"

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
  'PERFORATED': 'Perforated Pegboard',
  'STANDARD': 'Standard Pegboard - Basic Configuration',
  'PREMIUM': 'Premium Pegboard - Enhanced Organization',
  'CUSTOM': 'Custom Pegboard - Tailored Layout',
  
  // Pegboard Colors
  'WHITE': 'White Pegboard Finish',
  'GREY': 'Grey Pegboard Finish', 
  'BLACK': 'Black Pegboard Finish',
  
  // Basin Types (User Interface)
  'E_SINK': 'Standard E-Sink Basin',
  'E_SINK_DI': 'E-Sink Basin with Deionized Water',
  'E_DRAIN': 'E-Drain Basin for Drainage',
  
  // Basin Kit Assemblies (BOM Items)
  'T2-BSN-ESK-KIT': 'E-Sink Basin Kit with Automated Dosing',
  'T2-BSN-ESK-DI-KIT': 'E-Sink Kit for DI Water (No Bottom Fill)',
  'T2-BSN-EDR-KIT': 'E-Drain Basin Kit with Overflow Protection',
  
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

// Order data adapter to convert database structure to shared component format
const createOrderDataAdapter = (order: any) => {
  const buildNumbers = order.buildNumbers || []
  
  // Convert database order structure to configuration format
  const configurations: Record<string, any> = {}
  const accessories: Record<string, any> = {}
  
  buildNumbers.forEach((buildNumber: string) => {
    // Get configuration data for this build
    const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber) || {}
    const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
    const faucetConfigs = order.faucetConfigurations?.filter((fc: any) => fc.buildNumber === buildNumber) || []
    const sprayerConfigs = order.sprayerConfigurations?.filter((sc: any) => sc.buildNumber === buildNumber) || []
    const buildAccessories = order.selectedAccessories?.filter((sa: any) => sa.buildNumber === buildNumber) || []
    
    // Convert to shared component format
    configurations[buildNumber] = {
      sinkModelId: sinkConfig.sinkModelId || '',
      width: sinkConfig.width,
      length: sinkConfig.length,
      legsTypeId: sinkConfig.legsTypeId,
      feetTypeId: sinkConfig.feetTypeId,
      pegboard: sinkConfig.pegboard || false,
      pegboardTypeId: sinkConfig.pegboardTypeId,
      pegboardColorId: sinkConfig.pegboardColorId,
      drawersAndCompartments: sinkConfig.drawersAndCompartments || [],
      workflowDirection: sinkConfig.workflowDirection,
      basins: basinConfigs.map((bc: any) => ({
        basinTypeId: bc.basinTypeId,
        basinType: bc.basinTypeId,
        basinSizePartNumber: bc.basinSizePartNumber,
        basinSize: bc.basinSizePartNumber,
        addonIds: bc.addonIds || [],
        customWidth: bc.customWidth,
        customLength: bc.customLength,
        customDepth: bc.customDepth,
        customDimensions: (bc.customWidth || bc.customLength || bc.customDepth) ? {
          width: bc.customWidth,
          length: bc.customLength,
          depth: bc.customDepth
        } : undefined
      })),
      faucets: faucetConfigs.map((fc: any) => ({
        faucetTypeId: fc.faucetTypeId,
        quantity: fc.faucetQuantity || 1,
        placement: fc.faucetPlacement
      })),
      sprayers: sprayerConfigs.flatMap((sc: any) => 
        sc.sprayerTypeIds?.map((typeId: string, index: number) => ({
          sprayerTypeId: typeId,
          location: sc.sprayerLocations?.[index] || sc.sprayerLocation || 'Center',
          quantity: 1
        })) || []
      ),
      controlBoxId: sinkConfig.controlBoxId
    }
    
    // Convert accessories
    accessories[buildNumber] = buildAccessories.map((acc: any) => ({
      assemblyId: acc.assemblyId,
      accessoryId: acc.assemblyId,
      name: acc.assemblyId, // Will be resolved by getPartDescription
      partNumber: acc.assemblyId,
      quantity: acc.quantity,
      buildNumbers: [buildNumber]
    }))
  })
  
  return {
    buildNumbers,
    configurations,
    accessories,
    customerInfo: {
      poNumber: order.poNumber,
      customerName: order.customerName,
      salesPerson: order.salesPerson,
      projectName: order.projectName,
      wantDate: order.wantDate,
      notes: order.notes
    },
    sinkSelection: {
      sinkModelId: order.sinkConfigurations?.[0]?.sinkModelId || '',
      quantity: buildNumbers.length,
      buildNumbers
    }
  }
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
  // BOM states to match order review pattern (source of truth)
  const [bomLoading, setBomLoading] = useState(false)
  const [bomError, setBomError] = useState<string | null>(null)
  const [bomData, setBomData] = useState<any>(null)
  const [previewDocument, setPreviewDocument] = useState<any>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.orderId])

  // Load BOM data when order is loaded (matches order review pattern)
  useEffect(() => {
    if (order) {
      loadBOMData()
    }
  }, [order])

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

  // Load BOM data using the same source as order review (single source of truth)
  const loadBOMData = async () => {
    if (!order) return
    
    setBomLoading(true)
    setBomError(null)
    
    try {
      console.log('🔍 Loading BOM using same source as order review...')
      
      // Convert order data to the format expected by BOM generation
      // This matches the format used in order review step
      const customerInfo = {
        poNumber: order.poNumber,
        customerName: order.customerName,
        projectName: order.projectName,
        salesPerson: order.salesPerson,
        wantDate: order.wantDate,
        language: order.language,
        notes: order.notes
      }
      
      // Reconstruct configurations from database records
      const configurations: Record<string, any> = {}
      
      for (const buildNumber of order.buildNumbers) {
        // Get sink configuration for this build
        const sinkConfig = order.sinkConfigurations?.find((config: any) => 
          config.buildNumber === buildNumber
        )
        
        if (sinkConfig) {
          // Get basin configurations for this build
          const basinConfigs = order.basinConfigurations?.filter((basin: any) => 
            basin.buildNumber === buildNumber
          ) || []
          
          // Get faucet configurations for this build  
          const faucetConfigs = order.faucetConfigurations?.filter((faucet: any) => 
            faucet.buildNumber === buildNumber
          ) || []
          
          // Get sprayer configurations for this build
          const sprayerConfigs = order.sprayerConfigurations?.filter((sprayer: any) => 
            sprayer.buildNumber === buildNumber
          ) || []
          
          configurations[buildNumber] = {
            sinkModelId: sinkConfig.sinkModelId,
            sinkWidth: sinkConfig.sinkWidth,
            sinkLength: sinkConfig.sinkLength,
            width: sinkConfig.width,
            length: sinkConfig.length,
            legsTypeId: sinkConfig.legsTypeId,
            legTypeId: sinkConfig.legTypeId,
            feetTypeId: sinkConfig.feetTypeId,
            pegboard: sinkConfig.pegboard,
            pegboardTypeId: sinkConfig.pegboardTypeId,
            pegboardType: sinkConfig.pegboardType,
            pegboardColor: sinkConfig.pegboardColor,
            pegboardColorId: sinkConfig.pegboardColorId,
            pegboardSizePartNumber: sinkConfig.pegboardSizePartNumber,
            specificPegboardKitId: sinkConfig.specificPegboardKitId,
            drawersAndCompartments: sinkConfig.drawersAndCompartments || [],
            workflowDirection: sinkConfig.workflowDirection,
            controlBoxId: sinkConfig.controlBoxId,
            basins: basinConfigs.map((basin: any) => ({
              basinTypeId: basin.basinTypeId,
              basinSizePartNumber: basin.basinSizePartNumber,
              addonIds: basin.addonIds || [],
              customDepth: basin.customDepth,
              customLength: basin.customLength,
              customWidth: basin.customWidth
            })),
            faucets: faucetConfigs.map((faucet: any) => ({
              faucetTypeId: faucet.faucetTypeId,
              quantity: faucet.faucetQuantity || 1,
              placement: faucet.faucetPlacement
            })),
            sprayers: sprayerConfigs.map((sprayer: any) => ({
              hasSprayerSystem: true,
              sprayerTypeIds: [sprayer.sprayerTypeId],
              location: sprayer.sprayerLocation
            }))
          }
        }
      }
      
      // Reconstruct accessories from database records
      const accessories: Record<string, any> = {}
      for (const buildNumber of order.buildNumbers) {
        const buildAccessories = order.selectedAccessories?.filter((acc: any) => 
          acc.buildNumber === buildNumber
        ) || []
        
        accessories[buildNumber] = buildAccessories.map((acc: any) => ({
          assemblyId: acc.assemblyId,
          quantity: acc.quantity
        }))
      }
      
      // Use the same BOM generation endpoint as order review
      const requestBody = {
        customerInfo,
        sinkSelection: {
          sinkModelId: configurations[order.buildNumbers[0]]?.sinkModelId,
          quantity: order.buildNumbers.length,
          buildNumbers: order.buildNumbers
        },
        configurations,
        accessories
      }
      
      console.log('🔍 Regenerating BOM from order configuration:', {
        buildNumbers: order.buildNumbers,
        configurationsKeys: Object.keys(configurations),
        accessoriesKeys: Object.keys(accessories)
      })
      
      // Call the same preview BOM endpoint used by order review
      const response = await nextJsApiClient.post('/orders/preview-bom', requestBody)
      
      if (response.data.success) {
        console.log('✅ BOM regenerated successfully from order configuration')
        
        // Use the same data processing as order review
        const bomResult = response.data.data.bom || response.data.data
        const processedData = {
          ...response.data.data,
          bom: bomResult,
          totalItems: bomResult.totalItems || (bomResult.flattened || []).length
        }
        
        setBomData(processedData)
      } else {
        console.error('❌ Failed to regenerate BOM:', response.data.message)
        setBomError(response.data.message || 'Failed to regenerate BOM from order configuration')
      }
    } catch (error: any) {
      console.error('❌ Error regenerating BOM from order configuration:', error)
      
      // Enhanced error logging to capture validation details
      if (error.response?.data) {
        console.error('🔍 Full error response data:', JSON.stringify(error.response.data, null, 2))
        if (error.response.data.detailedErrors) {
          console.error('🔍 Detailed validation errors:', error.response.data.detailedErrors)
        }
        if (error.response.data.requestBody) {
          console.error('🔍 Request body that caused error:', JSON.stringify(error.response.data.requestBody, null, 2))
        }
      }
      
      // Show detailed error message if available
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.detailedErrors ? 
                            `Validation errors: ${error.response.data.detailedErrors.map(e => `${e.field}: ${e.message}`).join('; ')}` : 
                            'Failed to load BOM data')
      
      setBomError(errorMessage)
    } finally {
      setBomLoading(false)
    }
  }

  // Generate BOM (matches order review previewBOM pattern)
  const handleBOMGeneration = async () => {
    setBomLoading(true)
    setBomError(null)
    setBomData(null)
    
    try {
      const response = await nextJsApiClient.post(`/orders/${params.orderId}/generate-bom`)
      
      if (response.data.success) {
        toast({
          title: "BOM Generated",
          description: `Bill of Materials generated with ${response.data.data?.itemCount || 0} items`
        })
        // Refresh order data and reload BOM
        await fetchOrderDetails()
        // BOM data will be loaded by the loadBOMData call after fetchOrderDetails
      } else {
        setBomError(response.data.message || "Failed to generate BOM")
      }
    } catch (error: any) {
      console.error('BOM generation error:', error)
      setBomError(error.response?.data?.message || "Failed to generate BOM")
    } finally {
      setBomLoading(false)
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
  
  // Convert order data for shared components
  const adaptedOrderData = createOrderDataAdapter(order)

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
        <TabsList className={`grid w-full ${
          (user?.role === "ADMIN" || user?.role === "PROCUREMENT_SPECIALIST") && 
          ["ORDER_CREATED", "PARTS_SENT_WAITING_ARRIVAL"].includes(order.orderStatus) 
            ? "grid-cols-8" 
            : "grid-cols-7"
        }`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          {(user?.role === "ADMIN" || user?.role === "PROCUREMENT_SPECIALIST") && 
           ["ORDER_CREATED", "PARTS_SENT_WAITING_ARRIVAL"].includes(order.orderStatus) && (
            <TabsTrigger value="procurement">Procurement</TabsTrigger>
          )}
          <TabsTrigger value="qc">Quality Control</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Main Information Grid - 2 Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
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

                  {/* Order Details */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-700 border-b pb-1">Details</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-500 block">PO Number</span>
                        <span className="font-medium">{order.poNumber}</span>
                      </div>
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Status & Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status & Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Status */}
                  <div>
                    <span className="text-slate-500 text-sm block mb-2">Current Status</span>
                    <Badge className={`${statusColors[order.orderStatus] || "bg-gray-100 text-gray-700"} text-sm px-3 py-1`}>
                      {statusDisplayNames[order.orderStatus] || order.orderStatus}
                    </Badge>
                  </div>

                  {/* Configuration Summary */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 block">Sink Quantity</span>
                      <span className="font-medium">{order.buildNumbers.length} Unit{order.buildNumbers.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Configuration</span>
                      <span className="font-medium">
                        {(() => {
                          // Get all basin configs for enhanced description
                          const allBasinConfigs = order.basinConfigurations || []
                          return getEnhancedBasinDescription(allBasinConfigs)
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Accessories</span>
                      <span className="font-medium">{formatAccessoriesDisplay(order.selectedAccessories || [])}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Documents</span>
                      <span className="font-medium">{formatDocumentsDisplay(order.associatedDocuments || [])}</span>
                    </div>
                  </div>

                  {/* Sink Models */}
                  {order.buildNumbers.length > 0 && (
                    <div>
                      <span className="text-slate-500 text-sm block mb-2">
                        {order.buildNumbers.length === 1 ? 'Sink Model' : 'Sink Models'}
                      </span>
                      <div className="space-y-1">
                        {order.buildNumbers.map((buildNumber: string) => {
                          const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber)
                          if (!sinkConfig) return null
                          
                          const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
                          const basinCount = basinConfigs.length || 1
                          const length = sinkConfig.length || 48
                          const width = sinkConfig.width || 30
                          const lengthStr = length.toString().padStart(2, '0')
                          const widthStr = width.toString().padStart(2, '0')
                          const dimensions = lengthStr + widthStr
                          const buildSinkModel = `T2-${basinCount}B-${dimensions}HA`
                          
                          return (
                            <div key={buildNumber} className="text-sm">
                              <span className="font-medium">{buildNumber}: {buildSinkModel}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Description & Notes - Single Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Description */}
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
          </div>

          {/* Status Update */}
          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Change the order status based on current progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
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
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Add notes about this status change..."
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || statusUpdating}
                    className="w-full"
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
          <ConfigurationDisplay
            buildNumbers={adaptedOrderData.buildNumbers}
            configurations={adaptedOrderData.configurations}
            accessories={adaptedOrderData.accessories}
          />
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom" className="space-y-3">
          <BOMDisplay
            bomData={bomData}
            isLoading={bomLoading}
            error={bomError}
            onRetry={handleBOMGeneration}
            customerInfo={adaptedOrderData.customerInfo}
            sinkSelection={adaptedOrderData.sinkSelection}
            configurations={adaptedOrderData.configurations}
            accessories={adaptedOrderData.accessories}
            showDebugInfo={false}
          />
        </TabsContent>

        {/* Procurement Tab */}
        {(user?.role === "ADMIN" || user?.role === "PROCUREMENT_SPECIALIST") && 
         ["ORDER_CREATED", "PARTS_SENT_WAITING_ARRIVAL"].includes(order.orderStatus) && (
          <TabsContent value="procurement" className="space-y-4">
            <ProcurementTab
              orderId={order.id}
              orderStatus={order.orderStatus}
              bomData={bomData}
              bomLoading={bomLoading}
              bomError={bomError}
              onStatusChange={fetchOrderDetails}
            />
          </TabsContent>
        )}

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

