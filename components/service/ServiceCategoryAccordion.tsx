"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  ChevronDown, 
  ChevronRight, 
  Package, 
  Wrench,
  Zap,
  Settings,
  CircuitBoard,
  Droplets,
  Gauge,
  Shield,
  Lightbulb,
  ArrowUpCircle
} from "lucide-react"
import { ServiceAssemblyCard } from "./ServiceAssemblyCard"

interface ServiceComponent {
  id: string
  quantity: number
  notes?: string
  part?: {
    partId: string
    name: string
    manufacturerPartNumber?: string
    type: string
    status: string
    photoURL?: string
    technicalDrawingURL?: string
  }
  assembly?: {
    assemblyId: string
    name: string
    type: string
  }
}

interface ServiceAssembly {
  assemblyId: string
  name: string
  type: string
  canOrder: boolean
  isKit: boolean
  componentCount: number
  components: ServiceComponent[]
}

interface ServiceSubcategory {
  subcategoryId: string
  name: string
  description?: string
  assemblyCount: number
  componentCount: number
  assemblies: ServiceAssembly[]
}

interface ServiceCategoryAccordionProps {
  subcategory: ServiceSubcategory
  onAddToCart: (assembly: ServiceAssembly) => void
  onAddComponentToCart: (component: ServiceComponent) => void
  searchTerm?: string
}

// Icon mapping for different subcategories
const getSubcategoryIcon = (subcategoryId: string) => {
  const iconMap: Record<string, any> = {
    '719.001': Package, // WIRE BASKET BRACKET
    '719.002': Settings, // ESINK TOUCHSCREEN
    '719.003': Shield, // EMERGENCY BUTTON
    '719.004': Droplets, // ESINK VALVE PLATE
    '719.005': Droplets, // VALVE PLATE
    '719.006': Droplets, // DI VALVE PLATE
    '719.007': Droplets, // FAUCET COMPONENT
    '719.008': Droplets, // AIR/WATER GUNS
    '719.009': Droplets, // BOTTOM FILL
    '719.010': Gauge, // TEMPERATURE SENSOR
    '719.011': Zap, // POWER BAR
    '719.012': Settings, // SINK CASTERS/LEVELING FEET
    '719.013': Gauge, // OVERFLOW SENSOR
    '719.014': ArrowUpCircle, // LIFTER COMPONENT
    '719.015': Droplets, // ACCESSORY FAUCET
    '719.016': Settings, // CONTROL BOX
    '719.017': Droplets, // DRAIN HOSE COMPONENT
    '719.018': Package, // OTHERS
    '719.019': CircuitBoard, // E-SINK BOARD
    '719.020': CircuitBoard, // E-DRAIN BOARD
    '719.021': Lightbulb, // OVERHEAD LIGHT BOARD
    '719.022': Lightbulb, // BASIN LIGHT BOARD
    '719.023': CircuitBoard, // DOSING PUMP BOARD
    '719.024': CircuitBoard, // FLUSHING PUMP BOARD
    '719.025': Wrench, // DOSING PUMP
    '719.026': Wrench, // DOSING PUMP & TUBE SET
    '719.027': ArrowUpCircle, // UPGRADE KITS
  }
  return iconMap[subcategoryId] || Package
}

// Color mapping for different subcategory types
const getSubcategoryColor = (subcategoryId: string) => {
  const colorMap: Record<string, string> = {
    // Electronics/Boards - Blue
    '719.019': 'border-blue-200 bg-blue-50',
    '719.020': 'border-blue-200 bg-blue-50',
    '719.021': 'border-blue-200 bg-blue-50',
    '719.022': 'border-blue-200 bg-blue-50',
    '719.023': 'border-blue-200 bg-blue-50',
    '719.024': 'border-blue-200 bg-blue-50',
    '719.002': 'border-blue-200 bg-blue-50',
    
    // Water/Fluid - Cyan
    '719.004': 'border-cyan-200 bg-cyan-50',
    '719.005': 'border-cyan-200 bg-cyan-50',
    '719.006': 'border-cyan-200 bg-cyan-50',
    '719.007': 'border-cyan-200 bg-cyan-50',
    '719.008': 'border-cyan-200 bg-cyan-50',
    '719.009': 'border-cyan-200 bg-cyan-50',
    '719.015': 'border-cyan-200 bg-cyan-50',
    '719.017': 'border-cyan-200 bg-cyan-50',
    
    // Mechanical/Hardware - Green
    '719.001': 'border-green-200 bg-green-50',
    '719.012': 'border-green-200 bg-green-50',
    '719.014': 'border-green-200 bg-green-50',
    '719.016': 'border-green-200 bg-green-50',
    '719.025': 'border-green-200 bg-green-50',
    '719.026': 'border-green-200 bg-green-50',
    
    // Sensors - Purple
    '719.010': 'border-purple-200 bg-purple-50',
    '719.013': 'border-purple-200 bg-purple-50',
    
    // Safety/Emergency - Red
    '719.003': 'border-red-200 bg-red-50',
    
    // Power/Electrical - Yellow
    '719.011': 'border-yellow-200 bg-yellow-50',
    
    // Lighting - Orange
    '719.021': 'border-orange-200 bg-orange-50',
    '719.022': 'border-orange-200 bg-orange-50',
    
    // Upgrades - Indigo
    '719.027': 'border-indigo-200 bg-indigo-50',
    
    // Others - Gray
    '719.018': 'border-gray-200 bg-gray-50',
  }
  return colorMap[subcategoryId] || 'border-slate-200 bg-slate-50'
}

export function ServiceCategoryAccordion({ 
  subcategory, 
  onAddToCart, 
  onAddComponentToCart, 
  searchTerm 
}: ServiceCategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = getSubcategoryIcon(subcategory.subcategoryId)
  const colorClass = getSubcategoryColor(subcategory.subcategoryId)

  // Filter assemblies based on search term
  const filteredAssemblies = searchTerm 
    ? subcategory.assemblies.filter(assembly => 
        assembly.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assembly.assemblyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assembly.components.some(comp => 
          comp.part?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comp.part?.partId.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : subcategory.assemblies

  // Don't render if no assemblies match search
  if (searchTerm && filteredAssemblies.length === 0) {
    return null
  }

  return (
    <Card className={`${colorClass} transition-all duration-200 hover:shadow-md`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-semibold">{subcategory.name}</h3>
                  <p className="text-sm text-slate-600 font-normal">
                    {subcategory.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {filteredAssemblies.length} assemblies
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {subcategory.componentCount} components
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {filteredAssemblies.map((assembly) => (
                <ServiceAssemblyCard
                  key={assembly.assemblyId}
                  assembly={assembly}
                  onAddToCart={onAddToCart}
                  onAddComponentToCart={onAddComponentToCart}
                  searchTerm={searchTerm}
                />
              ))}
              
              {filteredAssemblies.length === 0 && !searchTerm && (
                <div className="text-center py-4 text-slate-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No assemblies available in this category</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}