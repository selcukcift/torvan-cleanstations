"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { 
  ChevronDown, 
  ChevronRight, 
  User, 
  Package, 
  Settings, 
  Droplets,
  Wrench,
  Grid3x3,
  ShoppingCart,
  Calendar,
  FileText,
  MapPin,
  Phone,
  Mail
} from "lucide-react"

interface DetailedReviewSectionProps {
  customerInfo: any
  sinkSelection: any
  configurations: any
  accessories: any
}

export function DetailedReviewSection({ 
  customerInfo, 
  sinkSelection, 
  configurations, 
  accessories 
}: DetailedReviewSectionProps) {
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
  const getPlacementLabel = (placement: string) => {
    switch (placement) {
      case 'CENTER': return 'Center'
      case 'LEFT': return 'Left Side'
      case 'RIGHT': return 'Right Side'
      case 'BETWEEN_1_2': return 'Between Basin 1-2'
      case 'BETWEEN_2_3': return 'Between Basin 2-3'
      case 'BETWEEN_BASINS': return 'Between Basins' // Legacy
      default: return placement || 'Center'
    }
  }

  const getLegDescription = (legId: string) => {
    const legDescriptions: { [key: string]: string } = {
      'T2-DL27-KIT': 'Height Adjustable Column Kit (DL27)',
      'T2-DL14-KIT': 'Height Adjustable Column Kit (DL14)',
      'T2-LC1-KIT': 'Height Adjustable Triple Column Kit (LC1)',
      'T2-DL27-FH-KIT': 'Fixed Height Column Kit (DL27)',
      'T2-DL14-FH-KIT': 'Fixed Height Column Kit (DL14)',
    }
    return legDescriptions[legId] || legId
  }

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['customer', 'sinks'])
  )

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'customer': return <User className="w-5 h-5" />
      case 'sinks': return <Package className="w-5 h-5" />
      case 'configurations': return <Settings className="w-5 h-5" />
      case 'accessories': return <ShoppingCart className="w-5 h-5" />
      default: return <Package className="w-5 h-5" />
    }
  }

  const renderSectionHeader = (section: string, title: string, count?: number) => (
    <div 
      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-3">
        {getSectionIcon(section)}
        <h3 className="text-lg font-semibold">{title}</h3>
        {count !== undefined && (
          <Badge variant="secondary">{count} item{count !== 1 ? 's' : ''}</Badge>
        )}
      </div>
      {expandedSections.has(section) ? (
        <ChevronDown className="w-5 h-5 text-slate-600" />
      ) : (
        <ChevronRight className="w-5 h-5 text-slate-600" />
      )}
    </div>
  )

  const renderCustomerInfo = () => (
    <div className="space-y-4 px-4 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-sm text-slate-600">PO Number</p>
              <p className="font-medium">{customerInfo.poNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-sm text-slate-600">Customer Name</p>
              <p className="font-medium">{customerInfo.customerName}</p>
            </div>
          </div>
          {customerInfo.projectName && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              <div>
                <p className="text-sm text-slate-600">Project Name</p>
                <p className="font-medium">{customerInfo.projectName}</p>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-sm text-slate-600">Sales Person</p>
              <p className="font-medium">{customerInfo.salesPerson}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-sm text-slate-600">Want Date</p>
              <p className="font-medium">
                {customerInfo.wantDate ? new Date(customerInfo.wantDate).toLocaleDateString() : 'Not specified'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-sm text-slate-600">Language</p>
              <Badge variant="outline">{customerInfo.language === 'EN' ? 'English' : 'French'}</Badge>
            </div>
          </div>
        </div>
      </div>
      {customerInfo.notes && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600 mb-1">Notes</p>
          <p className="text-sm">{customerInfo.notes}</p>
        </div>
      )}
    </div>
  )

  const renderSinkSelection = () => (
    <div className="space-y-4 px-4 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-600" />
          <div>
            <p className="text-sm text-slate-600">Sink Model</p>
            <p className="font-medium">{sinkSelection.sinkModelId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-slate-600" />
          <div>
            <p className="text-sm text-slate-600">Quantity</p>
            <p className="font-medium">{sinkSelection.quantity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <div>
            <p className="text-sm text-slate-600">Build Numbers</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {sinkSelection.buildNumbers?.map((buildNumber: string) => (
                <Badge key={buildNumber} variant="secondary" className="text-xs">
                  {buildNumber}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderConfigurationDetails = (buildNumber: string, config: any) => (
    <div key={buildNumber} className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-slate-600" />
        <h4 className="font-semibold">Build Number: {buildNumber}</h4>
      </div>

      {/* Sink Body */}
      <div className="space-y-2">
        <h5 className="font-medium text-slate-700 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Sink Body
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-slate-600">Dimensions</p>
            <p className="font-medium">{config.width}"W × {config.length}"L</p>
          </div>
          <div>
            <p className="text-slate-600">Legs</p>
            <p className="font-medium">{config.legsTypeId ? getLegDescription(config.legsTypeId) : 'Not selected'}</p>
          </div>
          <div>
            <p className="text-slate-600">Feet</p>
            <p className="font-medium">{config.feetTypeId || 'Not selected'}</p>
          </div>
          <div>
            <p className="text-slate-600">Workflow</p>
            <p className="font-medium">{config.workflowDirection || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Basins */}
      {config.basins && config.basins.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-slate-700 flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Basins ({config.basins.length})
          </h5>
          <div className="grid gap-2">
            {config.basins.map((basin: any, index: number) => (
              <div key={index} className="p-2 bg-slate-50 rounded space-y-2">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-xs">Basin {index + 1}</Badge>
                  <span className="text-sm">{basin.basinType || 'Not specified'}</span>
                  <span className="text-xs text-slate-600">{basin.basinSizePartNumber || 'No size'}</span>
                </div>
                {basin.customDimensions && (
                  <div className="text-xs text-slate-600 ml-16">
                    Custom: {basin.customDimensions.width}"W × {basin.customDimensions.length}"L × {basin.customDimensions.depth}"D
                  </div>
                )}
                {basin.addonIds && basin.addonIds.length > 0 && (
                  <div className="flex gap-1 ml-16">
                    {basin.addonIds.map((addon: string) => (
                      <Badge key={addon} variant="secondary" className="text-xs">
                        {addon}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Faucets */}
      {config.faucets && config.faucets.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-slate-700 flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Faucets ({config.faucets.length})
          </h5>
          <div className="grid gap-2">
            {config.faucets.map((faucet: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                <span>{faucet.faucetTypeId || 'Not specified'}</span>
                <Badge variant="outline" className="text-xs">{getPlacementLabel(faucet.placement)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sprayers */}
      {config.sprayers && config.sprayers.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-slate-700 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Sprayers ({config.sprayers.length})
          </h5>
          <div className="grid gap-2">
            {config.sprayers.map((sprayer: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                <span>{sprayer.sprayerTypeId || 'Not specified'}</span>
                <Badge variant="outline" className="text-xs">{sprayer.location || 'Not specified'}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawers & Compartments */}
      {config.drawersAndCompartments && config.drawersAndCompartments.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Drawers & Compartments ({config.drawersAndCompartments.length})
          </h5>
          <div className="grid gap-2">
            {config.drawersAndCompartments.map((item: string, index: number) => (
              <div key={index} className="flex items-center p-2 bg-slate-50 rounded text-sm">
                <Badge variant="outline" className="text-xs mr-2">{index + 1}</Badge>
                <span>{getDrawerDisplayName(item)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pegboard */}
      {config.pegboard && (
        <div className="space-y-2">
          <h5 className="font-medium text-slate-700 flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            Pegboard
          </h5>
          <div className="text-sm space-y-1">
            <p><span className="text-slate-600">Type:</span> {config.pegboardTypeId || 'Standard'}</p>
            <p><span className="text-slate-600">Size:</span> Auto-calculated based on {config.length}" length</p>
            {config.pegboardColorId && (
              <p><span className="text-slate-600">Color:</span> {extractColorFromId(config.pegboardColorId)}</p>
            )}
          </div>
        </div>
      )}

      {/* Control Box */}
      {config.controlBoxId && (
        <div className="space-y-2">
          <h5 className="font-medium text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Control Box
          </h5>
          <p className="text-sm">{config.controlBoxId}</p>
        </div>
      )}
    </div>
  )

  const renderAccessories = () => (
    <div className="space-y-4 px-4 pb-4">
      {Object.keys(accessories).length === 0 ? (
        <p className="text-slate-600 text-sm">No accessories selected</p>
      ) : (
        Object.entries(accessories).map(([buildNumber, buildAccessories]: [string, any]) => (
          <div key={buildNumber} className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Build Number: {buildNumber}</h4>
            <div className="grid gap-2">
              {(buildAccessories as any[]).map((accessory: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{accessory.name}</p>
                    <p className="text-xs text-slate-600">{accessory.assemblyId}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ×{accessory.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Order Review</h2>
      <p className="text-slate-600">Review all order details before submission</p>

      {/* Customer Information */}
      <Card>
        {renderSectionHeader('customer', 'Customer Information')}
        {expandedSections.has('customer') && renderCustomerInfo()}
      </Card>

      {/* Sink Selection */}
      <Card>
        {renderSectionHeader('sinks', 'Sink Selection', sinkSelection.quantity)}
        {expandedSections.has('sinks') && renderSinkSelection()}
      </Card>

      {/* Configurations */}
      <Card>
        {renderSectionHeader('configurations', 'Sink Configurations', Object.keys(configurations).length)}
        {expandedSections.has('configurations') && (
          <div className="space-y-4 px-4 pb-4">
            {Object.entries(configurations).map(([buildNumber, config]: [string, any]) =>
              renderConfigurationDetails(buildNumber, config)
            )}
          </div>
        )}
      </Card>

      {/* Accessories */}
      <Card>
        {renderSectionHeader('accessories', 'Accessories', Object.values(accessories).flat().length)}
        {expandedSections.has('accessories') && renderAccessories()}
      </Card>
    </div>
  )
}