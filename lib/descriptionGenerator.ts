/**
 * Dynamic Description Generator for Order Configurations
 * Generates natural language descriptions based on sink configuration
 */

interface BasinConfig {
  basinTypeId?: string
  basinType?: string
  basinSizePartNumber?: string
  basinSize?: string
  customWidth?: number | null
  customLength?: number | null
  customDepth?: number | null
  addonIds?: string[]
}

interface FaucetConfig {
  faucetTypeId?: string
  quantity?: number
  placement?: string
}

interface SprayerConfig {
  sprayerTypeId?: string
  location?: string
  quantity?: number
}

interface SinkConfig {
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
  basins: BasinConfig[]
  faucets?: FaucetConfig[]
  sprayers?: SprayerConfig[]
  controlBoxId?: string
}

interface OrderConfig {
  sinkSelection: {
    quantity: number
    buildNumbers: string[]
  }
  configurations: Record<string, SinkConfig>
}

/**
 * Generate dynamic description based on configuration
 */
export function generateOrderDescription(config: OrderConfig): string {
  const firstBuildNumber = config.sinkSelection.buildNumbers[0]
  const sinkConfig = config.configurations[firstBuildNumber]
  
  if (!sinkConfig) return "Configuration not available"

  const parts: string[] = []
  
  // Basin count and type analysis
  const eSinkCount = sinkConfig.basins.filter(b => 
    b.basinTypeId === 'E_SINK' || b.basinType === 'E_SINK'
  ).length
  
  const eDrainCount = sinkConfig.basins.filter(b => 
    b.basinTypeId === 'E_DRAIN' || b.basinType === 'E_DRAIN'
  ).length
  
  const totalBasins = sinkConfig.basins.length
  const sinkLength = sinkConfig.length || sinkConfig.width || 'CUSTOM'
  
  // Main sink description
  const basinText = totalBasins === 1 ? 'SINGLE BASIN' : 
                   totalBasins === 2 ? 'DOUBLE BASIN' : 
                   totalBasins === 3 ? 'TRIPLE BASIN' : `${totalBasins} BASIN`
  
  parts.push(`${basinText} STAINLESS STEEL`)
  
  // Height adjustment
  if (sinkConfig.legsTypeId?.includes('LC1') || sinkConfig.legsTypeId?.includes('DL27')) {
    parts.push('HEIGHT ADJUSTABLE')
  }
  
  parts.push(`REPROCESSING SINK, ${sinkLength}" X 30" X HA, COMPLETE WITH:`)
  
  // Faucet configuration
  const faucetCount = sinkConfig.faucets?.length || 1
  if (faucetCount === 1) {
    parts.push('ONE BACKSPLASH MOUNTED FAUCET,')
  } else {
    parts.push(`${faucetCount} BACKSPLASH MOUNTED FAUCETS,`)
  }
  
  parts.push('BOTTOM FILL FAUCETS,')
  
  // Basin-specific features based on type
  if (eDrainCount > 0 && eSinkCount > 0) {
    // Mixed configuration
    parts.push(`${eDrainCount}x eDRAIN PUSH BUTTON CONTROL,`)
    parts.push('ELECTRONIC DRAINS (EDRAIN) WITH OVER FLOW PROTECTION,')
  } else if (eDrainCount > 0) {
    // All E-Drain
    parts.push(`${eDrainCount}x eDRAIN PUSH BUTTON CONTROL,`)
  } else if (eSinkCount > 0) {
    // All E-Sink
    parts.push('ELECTRONIC DRAINS (EDRAIN) WITH OVER FLOW PROTECTION,')
  }
  
  // Basin specifications
  const firstBasin = sinkConfig.basins[0]
  if (firstBasin?.basinSizePartNumber?.includes('24X20X8')) {
    parts.push(`SINK BASINS 24" X 20" X 8",`)
  } else if (firstBasin?.basinSizePartNumber) {
    const basinSize = firstBasin.basinSizePartNumber.replace('T2-ADW-BASIN', '').replace('-', ' X ').replace('-', ' X ')
    parts.push(`SINK BASINS ${basinSize},`)
  }
  
  // Standard features
  parts.push('WRIST COMFORT EDGE,')
  parts.push('MARINE EDGE,')
  parts.push('LASER ETCHED LITER/GALLON VOLUME,')
  
  // Pegboard and lighting
  if (sinkConfig.pegboard) {
    const pegboardSize = sinkConfig.length ? `${sinkConfig.length}"` : '36"'
    parts.push(`PEGBOARD BACK WITH OVERHEAD LED LIGHT,`)
  }
  
  parts.push('BOTTOM SHELF,')
  
  // Legs configuration
  if (sinkConfig.legsTypeId?.includes('LC1') || sinkConfig.legsTypeId?.includes('DL27')) {
    parts.push('ELECTRO-MECHANICAL HEIGHT ADJUSTMENT COLUMNS,')
  }
  
  // Standard accessories
  parts.push('WATER TEMPERATURE GAUGE,')
  parts.push('ANTI-FATIGUE MAT')
  
  // E-Sink specific advanced features
  if (eSinkCount > 0) {
    parts.push('AND E-SINK. COMPLETED WITH:')
    parts.push('7" TOUCHSCREEN,')
    parts.push('AUTO-FILL,')
    parts.push('WATER TEMPERATURE CONTROL & MONITORING,')
    parts.push('OVERHEAD LED LIGHT CONTROL,')
    parts.push('HEIGHT ADJUSTABLE CONTROL,')
    parts.push('AND DOSING PUMP CONTROL WITH DOSING PUMP')
  } else {
    // Remove trailing comma for E-Drain only configs
    const lastIndex = parts.length - 1
    if (parts[lastIndex].endsWith(',')) {
      parts[lastIndex] = parts[lastIndex].slice(0, -1)
    }
  }
  
  return parts.join(' ')
}

/**
 * Generate short description for overview
 */
export function generateShortDescription(config: OrderConfig): string {
  const firstBuildNumber = config.sinkSelection.buildNumbers[0]
  const sinkConfig = config.configurations[firstBuildNumber]
  
  if (!sinkConfig) return "Configuration not available"
  
  const totalBasins = sinkConfig.basins.length
  const eSinkCount = sinkConfig.basins.filter(b => 
    b.basinTypeId === 'E_SINK' || b.basinType === 'E_SINK'
  ).length
  
  const eDrainCount = sinkConfig.basins.filter(b => 
    b.basinTypeId === 'E_DRAIN' || b.basinType === 'E_DRAIN'
  ).length
  
  const basinText = totalBasins === 1 ? 'Single Basin' : 
                   totalBasins === 2 ? 'Double Basin' : 
                   totalBasins === 3 ? 'Triple Basin' : `${totalBasins} Basin`
  
  let typeText = ''
  if (eSinkCount > 0 && eDrainCount > 0) {
    typeText = `(${eSinkCount} E-Sink + ${eDrainCount} E-Drain)`
  } else if (eSinkCount > 0) {
    typeText = 'E-Sink'
  } else if (eDrainCount > 0) {
    typeText = 'E-Drain'
  }
  
  const sinkLength = sinkConfig.length || 'Custom'
  
  return `${basinText} ${typeText} Reprocessing Sink, ${sinkLength}" Length`
}

/**
 * Generate dynamic sink model in T2-XB-YYYYHA format
 * T2 = Product line prefix
 * X = Basin count (1, 2, 3)
 * B = Basin indicator
 * YYYY = Length in inches (e.g., 9630 for 96.30")
 * HA = Height Adjustable suffix
 */
export function generateSinkModel(config: OrderConfig): string {
  const firstBuildNumber = config.sinkSelection.buildNumbers[0]
  const sinkConfig = config.configurations[firstBuildNumber]
  
  if (!sinkConfig) return "T2-1B-4800HA"
  
  // Extract basin count
  const basinCount = sinkConfig.basins.length || 1
  
  // Extract length and format as 4-digit with width
  const length = sinkConfig.length || 48
  const width = sinkConfig.width || 30
  
  // Format length and width as 4-digit string (LLLW format)
  // e.g., 96" length, 30" width = "9630"
  const lengthStr = length.toString().padStart(2, '0')
  const widthStr = width.toString().padStart(2, '0')
  const dimensions = lengthStr + widthStr
  
  return `T2-${basinCount}B-${dimensions}HA`
}

export default {
  generateOrderDescription,
  generateShortDescription,
  generateSinkModel
}