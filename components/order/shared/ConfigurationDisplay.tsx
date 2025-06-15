"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Types
export interface BasinConfiguration {
  basinTypeId?: string
  basinType?: string
  basinSizePartNumber?: string
  basinSize?: string
  addonIds?: string[]
  customWidth?: number | null
  customLength?: number | null
  customDepth?: number | null
  customDimensions?: {
    width?: number
    length?: number
    depth?: number
  }
}

export interface FaucetConfiguration {
  id?: string
  faucetTypeId?: string
  quantity?: number
  placement?: string
}

export interface SprayerConfiguration {
  id?: string
  sprayerTypeId?: string
  location?: string
  hasSprayerSystem?: boolean
  sprayerTypeIds?: string[]
  quantity?: number
  locations?: string[]
}

export interface SinkConfiguration {
  sinkModelId: string
  width?: number
  length?: number
  legsTypeId?: string
  feetTypeId?: string
  pegboard: boolean
  pegboardTypeId?: string
  pegboardColorId?: string
  drawersAndCompartments?: string[]
  workflowDirection?: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT'
  basins: BasinConfiguration[]
  faucets?: FaucetConfiguration[]
  sprayers?: SprayerConfiguration[]
  controlBoxId?: string
}

export interface SelectedAccessory {
  assemblyId: string
  accessoryId?: string
  name?: string
  partNumber?: string
  quantity: number
  buildNumbers?: string[]
}

interface ConfigurationDisplayProps {
  buildNumbers: string[]
  configurations: Record<string, SinkConfiguration>
  accessories: Record<string, SelectedAccessory[]>
  autoControlBoxes?: Record<string, any>
}

// Part/Assembly description mappings (shared from ReviewStep)
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

// Helper function to get drawer/compartment descriptions from part numbers
const getDrawerDescription = (drawerId: string) => {
  console.log('🔍 Looking up drawer description for:', drawerId)
  
  // Map actual drawer/compartment part numbers to descriptions from resource files
  const drawerDescriptionMap: { [key: string]: string } = {
    'T2-OA-2D-152012-STACKED': '15 X 20 X 12 Tall Stacked Two-Drawer Housing With Interior Liner Kit',
    'T2-OA-2D-152012-STACKED-KIT': '15 X 20 X 12 Tall Stacked Two-Drawer Housing With Interior Liner Kit',
    'T2-OA-PO-SHLF-1212': '12"X12" Pull Out Shelf (Only Compatible With HA Shelf)'
  }
  
  const result = drawerDescriptionMap[drawerId] || getPartDescription(drawerId) || drawerId
  console.log('🔍 Drawer description result:', result)
  return result
}

// Helper function to get basin add-on descriptions from part numbers  
const getBasinAddonDescription = (addonId: string) => {
  const addonDescriptionMap: { [key: string]: string } = {
    '706.65': 'P-Trap Disinfection Drain Unit',
    'T2-OA-MS-1026': 'P-Trap Disinfection Drain Unit',
    '706.67': 'Basin Light (E-Drain Kit)',
    'T2-OA-BASIN-LIGHT-EDR-KIT': 'Basin Light (E-Drain Kit)',
    '706.68': 'Basin Light (E-Sink Kit)', 
    'T2-OA-BASIN-LIGHT-ESK-KIT': 'Basin Light (E-Sink Kit)'
  }
  return addonDescriptionMap[addonId] || getPartDescription(addonId) || addonId
}

const getDrawerDisplayName = (drawerId: string) => {
  return getDrawerDescription(drawerId)
}

// Helper function to format basin type description
const getBasinTypeDescription = (basinTypeId: string) => {
  const basinTypeMap: { [key: string]: string } = {
    // User Interface IDs
    'E_DRAIN': 'E-Drain Basin Kit with Overflow Protection',
    'E_SINK': 'E-Sink Basin Kit with Automated Dosing',
    'E_SINK_DI': 'E-Sink Kit for DI Water (No Bottom Fill)',
    // Assembly IDs (from BOM)
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

export function ConfigurationDisplay({ 
  buildNumbers, 
  configurations, 
  accessories, 
  autoControlBoxes 
}: ConfigurationDisplayProps) {
  return (
    <div className="space-y-4">
      {buildNumbers.map((buildNumber: string) => {
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
                  <h4 className="text-2xl font-semibold text-slate-700 border-b pb-1">Sink Body</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Model:</span>
                      <span className="font-medium">{generateDisplayModel(config)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Width:</span>
                      <span className="font-medium">{config.width || 'N/A'}″</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Length:</span>
                      <span className="font-medium">{config.length || 'N/A'}″</span>
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
                  <h4 className="text-2xl font-semibold text-slate-700 border-b pb-1">Pegboard & Storage</h4>
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
                        <span className="font-medium">Yes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawers & Compartments */}
              {config.drawersAndCompartments && config.drawersAndCompartments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-2xl font-semibold text-slate-700 border-b pb-1">Drawers & Compartments</h4>
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
                  <h4 className="text-2xl font-semibold text-slate-700 border-b pb-1">Basin Configurations</h4>
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
                            {(basin.customDimensions || basin.customWidth || basin.customLength || basin.customDepth) && (
                              <div className="p-2 bg-amber-50 rounded border border-amber-200">
                                <span className="text-xs font-medium text-amber-800">Custom Dimensions:</span>
                                <div className="text-sm text-amber-700 mt-1">
                                  {basin.customDimensions ? 
                                    `${basin.customDimensions.width}"W × ${basin.customDimensions.length}"L × ${basin.customDimensions.depth}"D` :
                                    `${basin.customWidth || ''}"W × ${basin.customLength || ''}"L × ${basin.customDepth || ''}"D`
                                  }
                                </div>
                              </div>
                            )}
                            {basin.addonIds?.length > 0 && (
                              <div>
                                <span className="text-sm text-slate-600 block mb-2">Add-ons:</span>
                                <div className="flex flex-wrap gap-1">
                                  {basin.addonIds.map((addon: string, addonIdx: number) => (
                                    <Badge key={addonIdx} variant="secondary" className="text-xs bg-slate-200 text-slate-700">{getBasinAddonDescription(addon)}</Badge>
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
                  <h4 className="text-2xl font-semibold text-slate-700 border-b pb-1">Faucet Configurations</h4>
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
                  <h4 className="text-2xl font-semibold text-slate-700 border-b pb-1">Sprayer Configurations</h4>
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
                  <h4 className="text-2xl font-semibold text-slate-700 border-b pb-1">Selected Accessories</h4>
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
    </div>
  )
}