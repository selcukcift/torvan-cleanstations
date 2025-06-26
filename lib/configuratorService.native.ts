/**
 * Native TypeScript Configurator Service
 * Implements business rules from "sink configuration and bom.txt"
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SinkFamily {
  code: string
  name: string
  available: boolean
  description: string
}

interface SinkModel {
  id: string
  name: string
  basinCount: number
}

interface LegType {
  id: string
  name: string
  description: string
  available: boolean
  category?: string
}

interface FeetType {
  id: string
  name: string
  description: string
  available: boolean
}

interface PegboardOption {
  id: string
  name: string
  type: string
  available: boolean
}

interface BasinTypeOption {
  id: string
  name: string
  description: string
  available: boolean
}

interface BasinSizeOption {
  assemblyId: string
  id: string
  name: string
  dimensions: string
  available: boolean
  isCustom: boolean
}

interface BasinAddonOption {
  id: string
  name: string
  description: string
  available: boolean
}

interface FaucetTypeOption {
  assemblyId: string
  id: string
  name: string
  displayName: string
  description: string
  available: boolean
}

interface SprayerTypeOption {
  assemblyId: string
  id: string
  name: string
  displayName: string
  description: string
  available: boolean
}

/**
 * Get available sink families
 */
export async function getSinkFamilies(): Promise<SinkFamily[]> {
  return [
    { 
      code: 'MDRD', 
      name: 'MDRD CleanStation', 
      available: true,
      description: 'Medical Device Reprocessing Department CleanStations for healthcare facilities'
    },
    { 
      code: 'ENDOSCOPE_CLEANSTATION', 
      name: 'Endoscope CleanStation', 
      available: false,
      description: 'Specialized CleanStations for endoscope reprocessing'
    },
    { 
      code: 'INSTROSINK', 
      name: 'InstroSink', 
      available: false,
      description: 'Instrument cleaning and reprocessing sinks'
    }
  ]
}

/**
 * Get sink models for a specific family
 */
export async function getSinkModels(family: string): Promise<SinkModel[]> {
  if (family === 'MDRD') {
    // T2-B1 (1 basin), T2-B2 (2 basins), T2-B3 (3 basins)
    return [
      { id: 'T2-B1', name: 'T2-B1 (Single Basin)', basinCount: 1 },
      { id: 'T2-B2', name: 'T2-B2 (Dual Basin)', basinCount: 2 },
      { id: 'T2-B3', name: 'T2-B3 (Triple Basin)', basinCount: 3 }
    ]
  }
  // Other families return empty (under construction)
  return []
}

/**
 * Get available leg types
 */
export async function getLegTypes(): Promise<{ heightAdjustable: LegType[], fixedHeight: LegType[] }> {
  try {
    const legAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: '721.711',
        OR: [
          { assemblyId: { contains: 'DL27' } },
          { assemblyId: { contains: 'DL14' } },
          { assemblyId: { contains: 'LC1' } }
        ]
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    const heightAdjustable: LegType[] = []
    const fixedHeight: LegType[] = []

    legAssemblies.forEach(assembly => {
      // Shorten leg type names for dropdown display
      let shortName = assembly.name
      if (assembly.assemblyId.includes('DL27')) {
        shortName = assembly.assemblyId.includes('-FH-') ? 'DL27 Fixed Height' : 'DL27 Height Adjustable'
      } else if (assembly.assemblyId.includes('DL14')) {
        shortName = assembly.assemblyId.includes('-FH-') ? 'DL14 Fixed Height' : 'DL14 Height Adjustable'
      } else if (assembly.assemblyId.includes('LC1')) {
        shortName = assembly.assemblyId.includes('-FH-') ? 'LC1 Fixed Height' : 'LC1 Height Adjustable'
      }
      
      const legType: LegType = {
        id: assembly.assemblyId,
        name: shortName,
        description: assembly.assemblyId.includes('-FH-') ? 'Fixed height leg system' : 'Height adjustable leg system',
        available: true,
        category: assembly.assemblyId.includes('-FH-') ? 'Fixed Height' : 'Height Adjustable'
      }

      if (assembly.assemblyId.includes('-FH-')) {
        fixedHeight.push(legType)
      } else {
        heightAdjustable.push(legType)
      }
    })

    return { heightAdjustable, fixedHeight }
  } catch (error) {
    console.error('Error fetching leg types:', error)
    return { heightAdjustable: [], fixedHeight: [] }
  }
}

/**
 * Get available feet types
 */
export async function getFeetTypes(): Promise<FeetType[]> {
  try {
    const feetAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: '721.711',
        OR: [
          { assemblyId: { contains: 'CASTOR' } },
          { assemblyId: { contains: 'SEISMIC' } }
        ]
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    return feetAssemblies.map(assembly => {
      // Shorten feet type names for dropdown display
      let shortName = assembly.name
      if (assembly.assemblyId.includes('LEVELING-CASTOR')) {
        shortName = 'Leveling Casters'
      } else if (assembly.assemblyId.includes('SEISMIC-FEET')) {
        shortName = 'Seismic Feet'
      }
      
      return {
        id: assembly.assemblyId,
        name: shortName,
        description: `Feet/caster option`,
        available: true
      }
    })
  } catch (error) {
    console.error('Error fetching feet types:', error)
    return []
  }
}

/**
 * Get pegboard options
 */
export async function getPegboardOptions(): Promise<{ types: PegboardOption[], colors: PegboardOption[] }> {
  return {
    types: [
      {
        id: 'PERFORATED',
        name: 'Perforated Pegboard',
        type: 'PERFORATED',
        available: true
      },
      {
        id: 'SOLID',
        name: 'Solid Pegboard',
        type: 'SOLID',
        available: true
      }
    ],
    colors: [
      { id: 'GREEN', name: 'Green', type: 'COLOR', available: true },
      { id: 'BLACK', name: 'Black', type: 'COLOR', available: true },
      { id: 'YELLOW', name: 'Yellow', type: 'COLOR', available: true },
      { id: 'GREY', name: 'Grey', type: 'COLOR', available: true },
      { id: 'RED', name: 'Red', type: 'COLOR', available: true },
      { id: 'BLUE', name: 'Blue', type: 'COLOR', available: true },
      { id: 'ORANGE', name: 'Orange', type: 'COLOR', available: true },
      { id: 'WHITE', name: 'White', type: 'COLOR', available: true }
    ]
  }
}

/**
 * Get basin type options
 */
export async function getBasinTypeOptions(): Promise<BasinTypeOption[]> {
  try {
    const basinTypeAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '722',
        subcategoryCode: '722.713',
        type: 'KIT',
        assemblyId: { in: ['T2-BSN-EDR-KIT', 'T2-BSN-ESK-KIT', 'T2-BSN-ESK-DI-KIT'] }
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    // Map to user-friendly values
    return basinTypeAssemblies.map(assembly => {
      let id = assembly.assemblyId
      let name = assembly.name
      
      // Map assembly IDs to simpler user-facing values
      switch (assembly.assemblyId) {
        case 'T2-BSN-EDR-KIT':
          id = 'E_DRAIN'
          name = 'E-Drain Basin'
          break
        case 'T2-BSN-ESK-KIT':
          id = 'E_SINK'
          name = 'E-Sink Basin'
          break
        case 'T2-BSN-ESK-DI-KIT':
          id = 'E_SINK_DI'
          name = 'E-Sink DI Basin'
          break
      }
      
      return {
        id: id,
        name: name,
        description: `Basin type - ${assembly.subcategoryCode}`,
        available: true
      }
    })
  } catch (error) {
    console.error('Error fetching basin types:', error)
    return []
  }
}

/**
 * Get basin size options
 */
export async function getBasinSizeOptions(): Promise<{ standardSizes: BasinSizeOption[] }> {
  try {
    const basinSizeAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '722',
        subcategoryCode: '722.712',
        type: 'SIMPLE',
        assemblyId: { 
          in: [
            'ASSY-T2-ADW-BASIN20X20X8',
            'ASSY-T2-ADW-BASIN24X20X8', 
            'ASSY-T2-ADW-BASIN24X20X10',
            'ASSY-T2-ADW-BASIN30X20X8',
            'ASSY-T2-ADW-BASIN30X20X10'
          ] 
        }
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    const standardSizes = basinSizeAssemblies.map(assembly => {
      // Extract dimensions from name (format: SINK BASIN 24X20X8)
      const dimensionMatch = assembly.name.match(/(\d+X\d+X\d+)/)
      const dimensions = dimensionMatch ? dimensionMatch[1] : 'Standard'
      
      return {
        assemblyId: assembly.assemblyId,
        id: assembly.assemblyId,
        name: assembly.name,
        dimensions: dimensions,
        available: true,
        isCustom: false
      }
    })

    return { standardSizes }
  } catch (error) {
    console.error('Error fetching basin sizes:', error)
    return { standardSizes: [] }
  }
}

/**
 * Get basin addon options
 */
export async function getBasinAddonOptions(): Promise<BasinAddonOption[]> {
  try {
    const addonAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '706',
        subcategoryCode: { in: ['706.65', '706.67', '706.68'] }
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    return addonAssemblies.map(assembly => ({
      id: assembly.assemblyId,
      name: assembly.name,
      description: `Basin addon - ${assembly.subcategoryCode}`,
      available: true
    }))
  } catch (error) {
    console.error('Error fetching basin addons:', error)
    return []
  }
}

/**
 * Get faucet type options
 */
export async function getFaucetTypeOptions(basinType?: string): Promise<{ options: FaucetTypeOption[] }> {
  try {
    const faucetAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '720',
        subcategoryCode: '720.702',
        type: 'KIT',
        assemblyId: { 
          in: [
            'T2-OA-STD-FAUCET-WB-KIT',
            'T2-OA-PRE-RINSE-FAUCET-KIT',
            'T2-OA-DI-GOOSENECK-FAUCET-KIT'
          ] 
        }
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    const options = faucetAssemblies.map(assembly => {
      let displayName = assembly.name
      
      // Simplify display names
      switch (assembly.assemblyId) {
        case 'T2-OA-STD-FAUCET-WB-KIT':
          displayName = 'Standard Wrist Blade Faucet'
          break
        case 'T2-OA-PRE-RINSE-FAUCET-KIT':
          displayName = 'Pre-Rinse Spray Faucet'
          break
        case 'T2-OA-DI-GOOSENECK-FAUCET-KIT':
          displayName = 'DI Gooseneck Faucet'
          break
      }
      
      return {
        assemblyId: assembly.assemblyId,
        id: assembly.assemblyId,
        name: assembly.name,
        displayName: displayName,
        description: `Faucet type - ${assembly.subcategoryCode}`,
        available: true
      }
    })

    return { options }
  } catch (error) {
    console.error('Error fetching faucet types:', error)
    return { options: [] }
  }
}

/**
 * Get sprayer type options
 */
export async function getSprayerTypeOptions(): Promise<SprayerTypeOption[]> {
  try {
    const sprayerAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '720',
        subcategoryCode: '720.706',
        type: 'KIT',
        assemblyId: { 
          in: [
            'T2-OA-WATERGUN-ROSETTE-KIT',
            'T2-OA-WATERGUN-TURRET-KIT',
            'T2-OA-AIRGUN-ROSETTE-KIT',
            'T2-OA-AIRGUN-TURRET-KIT'
          ] 
        }
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    return sprayerAssemblies.map(assembly => {
      let displayName = assembly.name
      
      // Simplify display names
      switch (assembly.assemblyId) {
        case 'T2-OA-WATERGUN-ROSETTE-KIT':
          displayName = 'Water Gun (Rosette Mount)'
          break
        case 'T2-OA-WATERGUN-TURRET-KIT':
          displayName = 'Water Gun (Turret Mount)'
          break
        case 'T2-OA-AIRGUN-ROSETTE-KIT':
          displayName = 'Air Gun (Rosette Mount)'
          break
        case 'T2-OA-AIRGUN-TURRET-KIT':
          displayName = 'Air Gun (Turret Mount)'
          break
      }
      
      return {
        assemblyId: assembly.assemblyId,
        id: assembly.assemblyId,
        name: assembly.name,
        displayName: displayName,
        description: `Sprayer type - ${assembly.subcategoryCode}`,
        available: true
      }
    })
  } catch (error) {
    console.error('Error fetching sprayer types:', error)
    return []
  }
}

/**
 * Get control box options (dynamically determined based on basin configuration)
 */
export async function getControlBoxOptions(): Promise<any[]> {
  try {
    const controlBoxAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '719',
        subcategoryCode: { 
          in: ['719.176', '719.177', '719.178', '719.179', '719.180', '719.181', '719.182', '719.183', '719.184'] 
        }
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    })

    return controlBoxAssemblies.map(assembly => ({
      id: assembly.assemblyId,
      name: assembly.name,
      description: `Control box - ${assembly.subcategoryCode}`,
      available: true
    }))
  } catch (error) {
    console.error('Error fetching control box options:', error)
    return []
  }
}

/**
 * Determine appropriate control box based on basin configuration
 */
export async function getControlBox(basinConfigurations: any[]): Promise<any> {
  if (!basinConfigurations || basinConfigurations.length === 0) {
    return null
  }
  
  let eDrainCount = 0
  let eSinkCount = 0 // Includes both E_SINK and E_SINK_DI
  
  // Count basins by type
  basinConfigurations.forEach(basin => {
    if (basin.basinType === 'E_DRAIN' || basin.basinTypeId === 'E_DRAIN') {
      eDrainCount++
    } else if (
      basin.basinType === 'E_SINK' || basin.basinTypeId === 'E_SINK' ||
      basin.basinType === 'E_SINK_DI' || basin.basinTypeId === 'E_SINK_DI'
    ) {
      eSinkCount++
    }
  })
  
  // Control box mapping based on business rules
  const controlBoxMappings: Record<string, { eDrain: number; eSink: number }> = {
    'T2-CTRL-EDR1': { eDrain: 1, eSink: 0 },
    'T2-CTRL-ESK1': { eDrain: 0, eSink: 1 },
    'T2-CTRL-EDR1-ESK1': { eDrain: 1, eSink: 1 },
    'T2-CTRL-EDR2': { eDrain: 2, eSink: 0 },
    'T2-CTRL-ESK2': { eDrain: 0, eSink: 2 },
    'T2-CTRL-EDR3': { eDrain: 3, eSink: 0 },
    'T2-CTRL-ESK3': { eDrain: 0, eSink: 3 },
    'T2-CTRL-EDR1-ESK2': { eDrain: 1, eSink: 2 },
    'T2-CTRL-EDR2-ESK1': { eDrain: 2, eSink: 1 }
  }
  
  // Find matching control box
  for (const [controlBoxId, config] of Object.entries(controlBoxMappings)) {
    if (config.eDrain === eDrainCount && config.eSink === eSinkCount) {
      // Verify assembly exists in database
      const controlBox = await prisma.assembly.findUnique({
        where: { assemblyId: controlBoxId },
        select: { assemblyId: true, name: true }
      })
      
      if (controlBox) {
        return {
          ...controlBox,
          basinConfiguration: { eDrainCount, eSinkCount },
          mappingRule: `${eDrainCount} E-Drain + ${eSinkCount} E-Sink basins`
        }
      }
    }
  }
  
  console.warn(`No control box found for configuration: ${eDrainCount} E-Drain, ${eSinkCount} E-Sink basins`)
  return null
}

const configuratorService = {
  getSinkFamilies,
  getSinkModels,
  getLegTypes,
  getFeetTypes,
  getPegboardOptions,
  getBasinTypeOptions,
  getBasinSizeOptions,
  getBasinAddonOptions,
  getFaucetTypeOptions,
  getSprayerTypeOptions,
  getControlBoxOptions,
  getControlBox
}

export default configuratorService