import { prisma } from './prisma'
import { CustomPartNumberGenerator } from './customPartGenerator'
import { assemblyMapper } from './assemblyMapper'

// Types for BOM generation
interface BOMItem {
  id: string
  partNumber?: string
  name: string
  quantity: number
  category: string
  type: string
  level?: number
  children?: BOMItem[]
  components?: BOMItem[]
  hasChildren?: boolean
  isPart?: boolean
  isPlaceholder?: boolean
  isChild?: boolean
  indentLevel?: number
  isCustom?: boolean
  customPartSpec?: any
  customGeneratedPartNumber?: string
}

interface BOMResult {
  hierarchical: BOMItem[]
  flattened: BOMItem[]
  totalItems: number
  topLevelItems: number
}

interface OrderData {
  customer: {
    language: 'EN' | 'FR' | 'ES'
  }
  configurations: Record<string, SinkConfiguration>
  accessories: Record<string, AccessoryItem[]>
  buildNumbers: string[]
}

interface SinkConfiguration {
  sinkModelId: string
  length?: number
  sinkLength?: number
  legsTypeId?: string
  legTypeId?: string
  feetTypeId?: string
  pegboard?: boolean
  pegboardTypeId?: string
  pegboardType?: string
  pegboardColor?: string
  pegboardSizePartNumber?: string
  specificPegboardKitId?: string
  drawersAndCompartments?: string[]
  basins?: BasinConfiguration[]
  faucetTypeId?: string
  faucetQuantity?: number
  faucets?: FaucetConfiguration[]
  sprayer?: Sprayer
  sprayerTypeIds?: string[]
  sprayers?: SprayerConfiguration[]
  controlBoxId?: string
}

interface BasinConfiguration {
  basinTypeId?: string
  basinSizePartNumber?: string
  addonIds?: string[]
}

interface FaucetConfiguration {
  faucetTypeId: string
  quantity?: number
}

interface Sprayer {
  hasSprayerSystem: boolean
  sprayerTypeIds?: string[]
}

interface SprayerConfiguration {
  id?: string
  sprayerTypeId: string
  location?: string
}

interface AccessoryItem {
  assemblyId: string
  quantity: number
}

/**
 * Get assembly details with all components
 */
async function getAssemblyDetails(assemblyId: string) {
  console.log(`🔍 getAssemblyDetails: Querying database for ${assemblyId}`)
  try {
    const result = await prisma.assembly.findUnique({
      where: { assemblyId: assemblyId },
      include: {
        components: {
          include: {
            childPart: true,
            childAssembly: true,
          },
        },
      },
    })
    console.log(`🔍 getAssemblyDetails: Found ${assemblyId}:`, result ? 'YES' : 'NO')
    if (result) {
      console.log(`🔍 getAssemblyDetails: ${assemblyId} has ${result.components?.length || 0} components`)
    }
    return result
  } catch (error) {
    console.error(`❌ getAssemblyDetails: Database error for ${assemblyId}:`, error)
    throw error
  }
}

/**
 * Get part details (for items that might be Parts instead of Assemblies)
 */
async function getPartDetails(partId: string) {
  console.log(`🔍 getPartDetails: Querying database for ${partId}`)
  try {
    const result = await prisma.part.findUnique({
      where: { partId: partId }
    })
    console.log(`🔍 getPartDetails: Found ${partId}:`, result ? 'YES' : 'NO')
    return result
  } catch (error) {
    console.error(`❌ getPartDetails: Database error for ${partId}:`, error)
    throw error
  }
}


/**
 * Add control box with dynamic components based on basin configuration
 */
async function addControlBoxWithDynamicComponents(
  controlBoxId: string,
  quantity: number,
  category: string,
  bomList: BOMItem[],
  processedAssemblies = new Set<string>()
): Promise<void> {
  const assembly = await getAssemblyDetails(controlBoxId)
  if (!assembly) {
    console.warn(`Control box with ID ${controlBoxId} not found in database.`)
    
    // Try enhanced lookup with resource files as fallback
    const fallbackAssembly = assemblyMapper.enhancedAssemblyLookup(controlBoxId)
    if (fallbackAssembly) {
      console.log(`✅ Found control box ${controlBoxId} in resource files: ${fallbackAssembly.name}`)
      bomList.push({
        id: fallbackAssembly.id,
        name: fallbackAssembly.name,
        quantity: quantity,
        category: category || 'CONTROL_BOX',
        type: fallbackAssembly.type,
        components: [],
        isPlaceholder: false,
      })
      return
    }
    
    // Create enhanced placeholder with resolution suggestion
    const placeholder = assemblyMapper.createPlaceholderAssembly(controlBoxId, category)
    bomList.push(placeholder)
    
    if (placeholder.resolutionSuggestion) {
      console.warn(`💡 Suggestion: Consider using ${placeholder.resolutionSuggestion} instead of ${controlBoxId}`)
    }
    return
  }

  const bomItem: BOMItem = {
    id: assembly.assemblyId,
    name: assembly.name,
    quantity: quantity,
    category: category || assembly.type,
    type: assembly.type,
    components: [],
  }

  // Define dynamic components based on control box type
  let dynamicComponents: Array<{ partId: string; quantity: number }> = []
  
  // Base components that all control boxes share
  const baseComponents = [
    { partId: 'T2-RFK-BRD-MNT', quantity: 1 },
    { partId: 'T2-CTRL-RK3-SHELL', quantity: 1 },
    { partId: 'PW-105R3-06', quantity: 1 },
    { partId: 'LRS-100-24', quantity: 1 }
  ]
  
  // Determine specific components based on control box type
  switch (controlBoxId) {
    case 'T2-CTRL-EDR1':
      dynamicComponents = [
        { partId: 'Q13404-02', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 5 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-EDRAIN-BOARD-R3', quantity: 2 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 4 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 2 },
        { partId: 'T-ESOM-F4-01', quantity: 2 },
        { partId: 'T2-BSN-OHL-BTN', quantity: 1 }
      ]
      break
      
    case 'T2-CTRL-ESK1':
      dynamicComponents = [
        { partId: 'Q13404-02', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: '2926438', quantity: 1 },
        { partId: '2302081', quantity: 1 },
        { partId: '320X12539X', quantity: 1 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 10 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-EDRAIN-BOARD-R3', quantity: 1 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 4 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 2 },
        { partId: 'T2-RJ45-SPLITTER', quantity: 1 },
        { partId: 'T-ESOM-F4-01', quantity: 1 }
      ]
      break
      
    case 'T2-CTRL-EDR1-ESK1':
      dynamicComponents = [
        { partId: 'Q13404-02', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: '2926438', quantity: 1 },
        { partId: '2302081', quantity: 1 },
        { partId: '320X12539X', quantity: 1 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 15 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-ESINK-BOARD-R3', quantity: 1 },
        { partId: 'T2-EDRAIN-BOARD-R3', quantity: 1 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 4 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 4 },
        { partId: 'T2-RJ45-SPLITTER', quantity: 1 },
        { partId: 'T-ESOM-F4-01', quantity: 2 }
      ]
      break
      
    case 'T2-CTRL-EDR2':
      dynamicComponents = [
        { partId: 'Q13404-02', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 10 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-EDRAIN-BOARD-R3', quantity: 3 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 6 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 4 },
        { partId: 'T-ESOM-F4-01', quantity: 3 },
        { partId: 'T2-BSN-OHL-BTN', quantity: 1 }
      ]
      break
      
    case 'T2-CTRL-ESK2':
      dynamicComponents = [
        { partId: 'Q13404-02', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: '2926438', quantity: 2 },
        { partId: '2302081', quantity: 2 },
        { partId: '320X12539X', quantity: 2 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 20 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-ESINK-BOARD-R3', quantity: 2 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 4 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 5 },
        { partId: 'T2-RJ45-SPLITTER', quantity: 1 },
        { partId: 'MD-D237-1', quantity: 1 },
        { partId: 'T-ESOM-F4-01', quantity: 2 },
        { partId: 'N204-S01-BL-UD', quantity: 2 }
      ]
      break
      
    case 'T2-CTRL-EDR1-ESK2':
      dynamicComponents = [
        { partId: 'Q13404-01', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: '2926438', quantity: 2 },
        { partId: '2302081', quantity: 2 },
        { partId: '320X12539X', quantity: 2 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 25 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-ESINK-BOARD-R3', quantity: 2 },
        { partId: 'T2-EDRAIN-BOARD-R3', quantity: 1 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 6 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 5 },
        { partId: 'T2-RJ45-SPLITTER', quantity: 1 },
        { partId: 'N204-S01-BL-UD', quantity: 2 },
        { partId: 'MD-D237-1', quantity: 1 },
        { partId: 'T-ESOM-F4-01', quantity: 3 }
      ]
      break
      
    case 'T2-CTRL-EDR2-ESK1':
      dynamicComponents = [
        { partId: 'Q13404-01', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: '2926438', quantity: 1 },
        { partId: '2302081', quantity: 1 },
        { partId: '320X12539X', quantity: 1 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 20 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-ESINK-BOARD-R3', quantity: 1 },
        { partId: 'T2-EDRAIN-BOARD-R3', quantity: 2 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 6 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 5 },
        { partId: 'T-ESOM-F4-01', quantity: 3 }
      ]
      break
      
    case 'T2-CTRL-EDR3':
      dynamicComponents = [
        { partId: 'Q13404-01', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 15 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-ESINK-BOARD-R3', quantity: 3 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 6 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 5 },
        { partId: 'T-ESOM-F4-01', quantity: 4 },
        { partId: 'T2-BSN-OHL-BTN', quantity: 1 }
      ]
      break
      
    case 'T2-CTRL-ESK3':
      dynamicComponents = [
        { partId: 'Q13404-01', quantity: 1 },
        { partId: 'PW-105R3-06', quantity: 1 },
        { partId: '4995', quantity: 1 },
        { partId: '2926438', quantity: 3 },
        { partId: '2302081', quantity: 3 },
        { partId: '320X12539X', quantity: 3 },
        { partId: 'T2-M8-3P-MP-STR-0.61M', quantity: 30 },
        { partId: 'HDR-150-24', quantity: 1 },
        { partId: 'T2-ESINK-BOARD-R3', quantity: 3 },
        { partId: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { partId: '1201578', quantity: 6 },
        { partId: 'E7512-L-BLUE', quantity: 5 },
        { partId: 'M8-DUST-CAP-M', quantity: 5 },
        { partId: 'T2-RJ45-SPLITTER', quantity: 2 },
        { partId: 'N204-S01-BL-UD', quantity: 3 },
        { partId: 'MD-D237-1', quantity: 1 },
        { partId: 'T-ESOM-F4-01', quantity: 3 }
      ]
      break
  }

  // Add each component to the BOM
  for (const component of dynamicComponents) {
    // First check if it's a part
    const part = await prisma.part.findUnique({
      where: { partId: component.partId }
    })

    if (part) {
      bomItem.components!.push({
        id: part.partId,
        name: part.name,
        quantity: component.quantity,
        type: part.type,
        category: 'PART',
        components: [],
      })
    } else {
      // Check if it's an assembly
      const subAssembly = await prisma.assembly.findUnique({
        where: { assemblyId: component.partId }
      })

      if (subAssembly) {
        // Recursively add the sub-assembly
        await addItemToBOMRecursive(
          subAssembly.assemblyId,
          component.quantity,
          'SUB_ASSEMBLY',
          bomItem.components!,
          new Set(processedAssemblies)
        )
      } else {
        console.warn(`Component ${component.partId} not found as part or assembly`)
      }
    }
  }

  bomList.push(bomItem)
}

/**
 * Add item to BOM with recursive expansion of components
 */
async function addItemToBOMRecursive(
  assemblyId: string,
  quantity: number,
  category: string,
  bomList: BOMItem[],
  processedAssemblies = new Set<string>(),
  depth: number = 0
): Promise<void> {
  console.log(`🔧 addItemToBOMRecursive: Processing ${assemblyId} (category: ${category}) at depth ${depth}`)
  
  // Safety guard: warn at deep recursion levels
  if (depth > 20) {
    console.warn(`⚠️ Deep BOM recursion detected: ${assemblyId} at depth ${depth}`)
  }
  
  // Safety guard: prevent excessive recursion (should never happen with proper circular protection)
  if (depth > 100) {
    console.error(`❌ Maximum BOM recursion depth exceeded: ${assemblyId} at depth ${depth}`)
    throw new Error(`Maximum BOM recursion depth exceeded for assembly: ${assemblyId}`)
  }
  
  const processKey = `${assemblyId}_${category}`
  if (processedAssemblies.has(processKey)) {
    console.log(`⚠️ addItemToBOMRecursive: Skipping ${assemblyId} - already processed`)
    return
  }
  processedAssemblies.add(processKey)

  console.log(`🔧 addItemToBOMRecursive: Getting assembly details for ${assemblyId}`)
  const assembly = await getAssemblyDetails(assemblyId)
  if (!assembly) {
    console.warn(`Assembly with ID ${assemblyId} not found in database.`)
    
    // Check if it's actually a Part instead of Assembly
    const part = await getPartDetails(assemblyId)
    if (part) {
      console.log(`✅ Found ${assemblyId} as a Part instead of Assembly: ${part.name}`)
      bomList.push({
        id: part.partId,
        name: part.name,
        quantity: quantity,
        category: category || 'PART',
        type: part.type || 'COMPONENT',
        components: [],
        isPlaceholder: false,
        isPart: true
      })
      return
    }
    
    // Try enhanced lookup with resource files as fallback
    const fallbackAssembly = assemblyMapper.enhancedAssemblyLookup(assemblyId)
    if (fallbackAssembly) {
      console.log(`✅ Found assembly ${assemblyId} in resource files: ${fallbackAssembly.name}`)
      bomList.push({
        id: fallbackAssembly.id,
        name: fallbackAssembly.name,
        quantity: quantity,
        category: category || 'ASSEMBLY',
        type: fallbackAssembly.type,
        components: [],
        isPlaceholder: false,
      })
      return
    }
    
    // Create enhanced placeholder with resolution suggestion
    const placeholder = assemblyMapper.createPlaceholderAssembly(assemblyId, category)
    bomList.push(placeholder)
    
    if (placeholder.resolutionSuggestion) {
      console.warn(`💡 Suggestion: Consider using ${placeholder.resolutionSuggestion} instead of ${assemblyId}`)
    }
    return
  }

  const bomItem: BOMItem = {
    id: assembly.assemblyId,
    name: assembly.name,
    quantity: quantity,
    category: category || assembly.type,
    type: assembly.type,
    components: [],
  }

  if (assembly.components && assembly.components.length > 0) {
    for (const componentLink of assembly.components) {
      const part = componentLink.childPart
      const childAssembly = componentLink.childAssembly
      
      if (!part && !childAssembly) {
        console.warn(`No linked part or assembly found for component in assembly ${assembly.assemblyId}.`)
        bomItem.components!.push({
          id: `UNKNOWN_COMPONENT_${componentLink.id}`,
          name: `Unknown Component`,
          quantity: componentLink.quantity,
          type: 'UNKNOWN_TYPE',
          category: 'UNKNOWN',
          components: [],
          isPlaceholder: true,
        })
        continue
      }

      // If it's a direct child assembly
      if (childAssembly) {
        await addItemToBOMRecursive(
          childAssembly.assemblyId,
          componentLink.quantity * quantity,
          'SUB_ASSEMBLY',
          bomItem.components!,
          processedAssemblies,
          depth + 1
        )
      } else if (part) {
        // Check if this part itself is an assembly that needs further expansion
        // Use ASSY- prefix convention for assembly lookup
        const possibleAssemblyId = part.partId.startsWith('ASSY-') ? part.partId : `ASSY-${part.partId}`
        const subAssembly = await prisma.assembly.findUnique({
          where: { assemblyId: possibleAssemblyId },
          include: { components: { include: { childPart: true, childAssembly: true } } }
        })

        if (subAssembly) {
          // It's a sub-assembly
          const subAssemblyBomItem: BOMItem = {
            id: subAssembly.assemblyId,
            name: subAssembly.name,
            quantity: componentLink.quantity * quantity,
            type: subAssembly.type,
            category: 'SUB_ASSEMBLY',
            components: [],
          }

          // Recursively add components of the sub-assembly
          if (subAssembly.components && subAssembly.components.length > 0) {
            for (const subComponentLink of subAssembly.components) {
              const subPart = subComponentLink.childPart
              if (!subPart) continue

              // Check if this subPart is an assembly again
              // Use ASSY- prefix convention for assembly lookup
              const possibleDeeperAssemblyId = subPart.partId.startsWith('ASSY-') ? subPart.partId : `ASSY-${subPart.partId}`
              const deeperSubAssembly = await prisma.assembly.findUnique({
                where: { assemblyId: possibleDeeperAssemblyId }
              })

              if (deeperSubAssembly) {
                await addItemToBOMRecursive(
                  deeperSubAssembly.assemblyId,
                  subComponentLink.quantity * quantity,
                  'SUB_COMPONENT_ASSEMBLY',
                  subAssemblyBomItem.components!,
                  processedAssemblies,
                  depth + 1
                )
              } else {
                subAssemblyBomItem.components!.push({
                  id: subPart.partId,
                  name: subPart.name,
                  quantity: subComponentLink.quantity * quantity,
                  type: subPart.type,
                  category: 'PART',
                  components: [],
                })
              }
            }
          }
          bomItem.components!.push(subAssemblyBomItem)
        } else {
          // It's a simple part
          bomItem.components!.push({
            id: part.partId,
            name: part.name,
            quantity: componentLink.quantity * quantity,
            type: part.type,
            category: 'PART',
            components: [],
          })
        }
      }
    }
  }
  bomList.push(bomItem)
}

/**
 * Add BOM item with complete hierarchical structure
 */
async function addItemToBOMWithPartNumber(
  assemblyId: string,
  quantity: number,
  category: string,
  bom: BOMItem[],
  processedAssemblies = new Set<string>(),
  level = 0
): Promise<void> {
  const processKey = `${assemblyId}-${level}`
  if (processedAssemblies.has(processKey)) return
  processedAssemblies.add(processKey)

  const assembly = await getAssemblyDetails(assemblyId)
  if (!assembly) {
    console.warn(`Assembly not found: ${assemblyId}`)
    return
  }

  // Create BOM item with part number and hierarchy info
  const bomItem: BOMItem = {
    id: assembly.assemblyId,
    partNumber: assembly.subcategoryCode || assembly.categoryCode || 'NO-PART-NUMBER',
    name: assembly.name,
    quantity: quantity,
    category: category,
    type: assembly.type,
    level: level,
    children: [],
    hasChildren: assembly.components && assembly.components.length > 0
  }

  // Recursively add child components
  if (assembly.components && assembly.components.length > 0) {
    for (const component of assembly.components) {
      if (component.childAssembly) {
        // Child is an assembly - recurse deeper
        await addItemToBOMWithPartNumber(
          component.childAssembly.assemblyId,
          component.quantity * quantity,
          `${category}_SUB`,
          bomItem.children!,
          processedAssemblies,
          level + 1
        )
      } else if (component.childPart) {
        // Child is a part - terminal node
        bomItem.children!.push({
          id: component.childPart.partId,
          partNumber: component.childPart.partId,
          name: component.childPart.name,
          quantity: component.quantity * quantity,
          category: 'PART',
          type: component.childPart.type,
          level: level + 1,
          children: [],
          hasChildren: false,
          isPart: true
        })
      }
    }
  }

  bom.push(bomItem)
}

/**
 * Check if sink configuration is complete enough to determine control box
 */
function isSinkConfigurationComplete(config: SinkConfiguration): boolean {
  // Must have sink model
  if (!config.sinkModelId) return false
  
  // Must have basins configured
  if (!config.basins || config.basins.length === 0) return false
  
  // Check if all basins have basin types configured
  const allBasinsHaveTypes = config.basins.every(basin => 
    basin.basinTypeId && basin.basinTypeId !== 'undefined'
  )
  
  if (!allBasinsHaveTypes) return false
  
  // Check if basin count matches sink model expectations
  const sinkModel = config.sinkModelId
  const expectedBasinCount = sinkModel === 'T2-B1' ? 1 : 
                            sinkModel === 'T2-B2' ? 2 : 
                            sinkModel === 'T2-B3' ? 3 : 0
  
  // Only require control box when we have the expected number of basins
  if (config.basins.length < expectedBasinCount) return false
  
  return true
}

/**
 * Auto-select control box based on basin type combinations
 */
function getAutoControlBoxId(basins: BasinConfiguration[]): string | null {
  if (!basins || basins.length === 0) return null
  
  // Count basin types (treating E_SINK_DI as E_SINK for control box logic)
  const eSinks = basins.filter(b => b.basinTypeId === 'T2-BSN-ESK-KIT' || b.basinTypeId === 'T2-BSN-ESK-DI-KIT').length
  const eDrains = basins.filter(b => b.basinTypeId === 'T2-BSN-EDR-KIT').length
  
  // Control box logic from document (lines 151-159)
  if (eDrains === 1 && eSinks === 0) return 'T2-CTRL-EDR1'          // 719.176
  if (eDrains === 0 && eSinks === 1) return 'T2-CTRL-ESK1'          // 719.177
  if (eDrains === 1 && eSinks === 1) return 'T2-CTRL-EDR1-ESK1'     // 719.178
  if (eDrains === 2 && eSinks === 0) return 'T2-CTRL-EDR2'          // 719.179
  if (eDrains === 0 && eSinks === 2) return 'T2-CTRL-ESK2'          // 719.180
  if (eDrains === 3 && eSinks === 0) return 'T2-CTRL-EDR3'          // 719.181
  if (eDrains === 0 && eSinks === 3) return 'T2-CTRL-ESK3'          // 719.182
  if (eDrains === 1 && eSinks === 2) return 'T2-CTRL-EDR1-ESK2'     // 719.183
  if (eDrains === 2 && eSinks === 1) return 'T2-CTRL-EDR2-ESK1'     // 719.184
  
  console.warn(`No control box defined for ${eDrains} E-Drains and ${eSinks} E-Sinks`)
  return null
}

/**
 * Get specific pegboard kit ID based on sink length, type, and optional color
 */
function getSpecificPegboardKitId(sinkLength: number, pegboardType: string, color?: string): string | null {
  if (!sinkLength || !pegboardType) return null
  
  // Standard pegboard sizes with coverage ranges  
  const pegboardSizes = [
    { size: '3436', covers: [34, 47] },
    { size: '4836', covers: [48, 59] },
    { size: '6036', covers: [60, 71] },
    { size: '7236', covers: [72, 83] },
    { size: '8436', covers: [84, 95] },
    { size: '9636', covers: [95, 107] },
    { size: '10836', covers: [108, 119] },
    { size: '12036', covers: [120, 130] }
  ]

  // Find appropriate size based on sink length
  const selectedSize = pegboardSizes.find(pb => 
    sinkLength >= pb.covers[0] && sinkLength <= pb.covers[1]
  ) || pegboardSizes[pegboardSizes.length - 1] // Default to largest if over range

  // Map pegboard type to suffix
  const typeCode = pegboardType === 'PERFORATED' ? 'PERF' : 'SOLID'
  
  // If color is specified, use colored kit, otherwise use size-only kit
  if (color && color.trim()) {
    const colorCode = color.toUpperCase()
    return `T2-ADW-PB-${selectedSize.size}-${colorCode}-${typeCode}-KIT`
  } else {
    return `T2-ADW-PB-${selectedSize.size}-${typeCode}-KIT`
  }
}

/**
 * Get pegboard size assembly based on sink length
 */
function getPegboardSizeByLength(sinkLength: number): string | null {
  if (!sinkLength) return null
  
  // Pegboard size logic from document (lines 90-97)
  if (sinkLength >= 34 && sinkLength <= 47) return 'T2-ADW-PB-3436'   // 715.120
  if (sinkLength >= 48 && sinkLength <= 59) return 'T2-ADW-PB-4836'   // 715.121
  if (sinkLength >= 60 && sinkLength <= 71) return 'T2-ADW-PB-6036'   // 715.122
  if (sinkLength >= 72 && sinkLength <= 83) return 'T2-ADW-PB-7236'   // 715.123
  if (sinkLength >= 84 && sinkLength <= 95) return 'T2-ADW-PB-8436'   // 715.124
  if (sinkLength >= 96 && sinkLength <= 107) return 'T2-ADW-PB-9636'  // 715.125
  if (sinkLength >= 108 && sinkLength <= 119) return 'T2-ADW-PB-10836' // 715.126
  if (sinkLength >= 120 && sinkLength <= 130) return 'T2-ADW-PB-12036' // 715.127
  
  console.warn(`No pegboard size defined for sink length: ${sinkLength}`)
  return null
}

/**
 * Auto-select faucet for E-Sink DI basins
 */
function getAutoSelectedFaucets(basins: BasinConfiguration[]): Array<{ faucetTypeId: string; quantity: number; autoSelected: boolean; reason: string }> {
  if (!basins || basins.length === 0) return []
  
  const autoFaucets: Array<{ faucetTypeId: string; quantity: number; autoSelected: boolean; reason: string }> = []
  
  // Auto-select DI gooseneck faucet for E-Sink DI basins (document line 175)
  const eSinkDICount = basins.filter(b => b.basinTypeId === 'T2-BSN-ESK-DI-KIT').length
  if (eSinkDICount > 0) {
    autoFaucets.push({
      faucetTypeId: 'T2-OA-DI-GOOSENECK-FAUCET-KIT',  // 706.60
      quantity: eSinkDICount,
      autoSelected: true,
      reason: 'Auto-selected for E-Sink DI basins'
    })
  }
  
  return autoFaucets
}

/**
 * Flatten hierarchical BOM for display while preserving structure info
 */
function flattenBOMForDisplay(hierarchicalBom: BOMItem[]): BOMItem[] {
  const flattened: BOMItem[] = []
  
  function flattenRecursive(items: BOMItem[], parentLevel = 0) {
    for (const item of items) {
      // Ensure level information is preserved from generation
      const actualLevel = item.level !== undefined ? item.level : parentLevel
      
      // Add the item itself with comprehensive level information
      flattened.push({
        ...item,
        isChild: actualLevel > 0,
        indentLevel: actualLevel,
        level: actualLevel,
        hasChildren: (item.components && item.components.length > 0) || (item.children && item.children.length > 0)
      })
      
      // Recursively add children (handle both 'components' and 'children' properties)
      const childItems = item.components || item.children || []
      if (childItems.length > 0) {
        flattenRecursive(childItems, actualLevel + 1)
      }
    }
  }
  
  flattenRecursive(hierarchicalBom)
  
  // Add debug information about flattening
  console.log(`🔧 BOM Service: Flattened ${flattened.length} items`)
  const levelCounts = {}
  flattened.forEach(item => {
    const level = item.indentLevel || 0
    levelCounts[level] = (levelCounts[level] || 0) + 1
  })
  console.log(`🔧 BOM Service: Level distribution:`, levelCounts)
  
  return flattened
}

/**
 * Main BOM generation function - native TypeScript implementation
 */
export async function generateBOMForOrder(orderData: OrderData): Promise<BOMResult> {
  console.log('🔧 BOM Service: Starting BOM generation')
  console.log('🔧 BOM Service: Input data:', JSON.stringify(orderData, null, 2))
  
  try {
    // Validate input data structure
    if (!orderData) {
      throw new Error('OrderData is null or undefined')
    }
    
    if (!orderData.customer) {
      throw new Error('Customer information is missing')
    }
    
    if (!orderData.configurations) {
      throw new Error('Configurations are missing')
    }
    
    if (!orderData.buildNumbers || !Array.isArray(orderData.buildNumbers)) {
      throw new Error('Build numbers are missing or invalid')
    }
    
    const bom: BOMItem[] = []
    const { customer, configurations, accessories: orderAccessories, buildNumbers } = orderData
    
    console.log('🔧 BOM Service: Customer language:', customer.language)
    console.log('🔧 BOM Service: Build numbers:', buildNumbers)
    console.log('🔧 BOM Service: Configurations count:', Object.keys(configurations).length)

  // 1. Add system items
  let manualKitId: string
  switch (customer.language) {
    case 'FR':
      manualKitId = 'T2-STD-MANUAL-FR-KIT'
      break
    case 'ES':
      manualKitId = 'T2-STD-MANUAL-SP-KIT'
      break
    default:
      manualKitId = 'T2-STD-MANUAL-EN-KIT'
  }
  
  console.log('🔧 BOM Service: Adding manual kit:', manualKitId)
  
  if (manualKitId) {
    try {
      await addItemToBOMRecursive(manualKitId, 1, 'SYSTEM', bom, new Set())
      console.log('✅ BOM Service: Manual kit added successfully')
    } catch (error) {
      console.error('❌ BOM Service: Error adding manual kit:', error)
      throw error
    }
  }

  for (const buildNumber of buildNumbers) {
    console.log(`🔧 BOM Service: Processing build number: ${buildNumber}`)
    const config = configurations[buildNumber]
    if (!config) {
      console.warn(`⚠️ BOM Service: No configuration found for build number: ${buildNumber}`)
      continue
    }
    
    console.log('🔧 BOM Service: Config for build:', JSON.stringify(config, null, 2))

    const {
      sinkModelId,
      legsTypeId,
      legTypeId,
      feetTypeId,
      pegboard,
      pegboardTypeId,
      pegboardType,
      pegboardColor,
      pegboardSizePartNumber,
      specificPegboardKitId,
      drawersAndCompartments,
      basins,
      faucetTypeId,
      faucetQuantity,
      faucets,
      sprayer,
      sprayerTypeIds,
      sprayers,
      controlBoxId,
      length,
      sinkLength
    } = config

    // 2. Sink Body Assembly
    const actualLength = length || sinkLength
    let sinkBodyAssemblyId: string | undefined
    if (actualLength) {
      // Validate minimum length
      if (actualLength < 48) {
        console.warn(`Invalid sink length: ${actualLength}" - minimum length is 48"`)
        throw new Error(`Sink length must be at least 48". Current length: ${actualLength}"`)
      }
      
      // Original rules based on available body assemblies
      if (actualLength >= 48 && actualLength <= 60) {
        sinkBodyAssemblyId = 'T2-BODY-48-60-HA'
      } else if (actualLength >= 61 && actualLength <= 72) {
        sinkBodyAssemblyId = 'T2-BODY-61-72-HA'
      } else if (actualLength >= 73 && actualLength <= 120) {
        sinkBodyAssemblyId = 'T2-BODY-73-120-HA'
      }
      
      if (sinkBodyAssemblyId) {
        console.log(`Selected sink body assembly: ${sinkBodyAssemblyId} for length: ${actualLength}`)
        await addItemToBOMRecursive(sinkBodyAssemblyId, 1, 'SINK_BODY', bom, new Set())
      } else {
        console.warn(`No sink body assembly found for length: ${actualLength} - length must be between 48" and 120"`)
        throw new Error(`No sink body assembly available for length: ${actualLength}". Supported range: 48"-120"`)
      }
    } else if (sinkModelId) {
      console.log(`Sink length not provided, relying on other components or sinkModelId: ${sinkModelId} if it includes body.`)
    }

    // 3. Legs Kit (handle both legTypeId and legsTypeId)
    const actualLegTypeId = legTypeId || legsTypeId
    if (actualLegTypeId) {
      await addItemToBOMRecursive(actualLegTypeId, 1, 'LEGS', bom, new Set())
    }

    // 4. Feet Type
    if (feetTypeId) {
      await addItemToBOMRecursive(feetTypeId, 1, 'FEET', bom, new Set())
    }
    
    // 5. Pegboard (Updated with specific kit logic)
    if (pegboard) {
      // MANDATORY: Overhead light kit (Document line 113)
      await addItemToBOMRecursive('T2-OHL-MDRD-KIT', 1, 'PEGBOARD_MANDATORY', bom, new Set())
      
      // Track whether we've added a specific pegboard kit to prevent duplicates
      let hasAddedSpecificPegboardKit = false
      
      // Only add pegboard kits if pegboard type is actually selected
      if (pegboardType || pegboardTypeId || specificPegboardKitId) {
        // Use specific pegboard kit if available (from BOM Debug Helper)
        if (specificPegboardKitId) {
          console.log(`Using specific pegboard kit from config: ${specificPegboardKitId}`)
          await addItemToBOMRecursive(specificPegboardKitId, 1, 'PEGBOARD_SPECIFIC_KIT', bom, new Set())
          hasAddedSpecificPegboardKit = true
        }
        // Calculate specific kit based on configuration
        else if (pegboardType && actualLength) {
          // Use color if specified, otherwise use size-only kit
          const specificKitId = getSpecificPegboardKitId(actualLength, pegboardType, pegboardColor)
          if (specificKitId) {
            const kitType = pegboardColor ? 'PEGBOARD_COLORED_KIT' : 'PEGBOARD_SIZE_KIT'
            console.log(`Calculated specific pegboard kit: ${specificKitId} (length: ${actualLength}, type: ${pegboardType}${pegboardColor ? `, color: ${pegboardColor}` : ', no color specified'})`)
            await addItemToBOMRecursive(specificKitId, 1, kitType, bom, new Set())
            hasAddedSpecificPegboardKit = true
          } else {
            console.warn('Failed to calculate specific pegboard kit, falling back to generic')
            // Fallback to generic kits
            if (pegboardTypeId === 'PERFORATED' || pegboardType === 'PERFORATED') {
              await addItemToBOMRecursive('T2-ADW-PB-PERF-KIT', 1, 'PEGBOARD_GENERIC', bom, new Set())
              hasAddedSpecificPegboardKit = true
            } else if (pegboardTypeId === 'SOLID' || pegboardType === 'SOLID') {
              await addItemToBOMRecursive('T2-ADW-PB-SOLID-KIT', 1, 'PEGBOARD_GENERIC', bom, new Set())
              hasAddedSpecificPegboardKit = true
            }
          }
        }
        // Fallback to legacy logic for backward compatibility
        else if (pegboardTypeId && actualLength) {
          console.log('Using legacy pegboard logic with size-based kit fallback')
          // Try to use size-based kit for legacy configurations (no color)
          const legacyType = pegboardTypeId === 'PERFORATED' ? 'PERFORATED' : 'SOLID'
          const specificKitId = getSpecificPegboardKitId(actualLength, legacyType) // No color parameter
          if (specificKitId) {
            console.log(`Legacy fallback using size-based kit: ${specificKitId} (length: ${actualLength}, type: ${legacyType}, no color)`)
            await addItemToBOMRecursive(specificKitId, 1, 'PEGBOARD_LEGACY_SIZE', bom, new Set())
            hasAddedSpecificPegboardKit = true
          } else {
            // Final fallback to static kits
            console.log('Final fallback to static pegboard kits')
            if (pegboardTypeId === 'PERFORATED') {
              await addItemToBOMRecursive('T2-ADW-PB-PERF-KIT', 1, 'PEGBOARD_LEGACY_STATIC', bom, new Set())
              hasAddedSpecificPegboardKit = true
            } else if (pegboardTypeId === 'SOLID') {
              await addItemToBOMRecursive('T2-ADW-PB-SOLID-KIT', 1, 'PEGBOARD_LEGACY_STATIC', bom, new Set())
              hasAddedSpecificPegboardKit = true
            }
          }
        }
      } else {
        console.log('Pegboard enabled but no type selected - only adding overhead light kit')
      }
      
      // Color component (if not included in specific kit)
      if (pegboardColor && !hasAddedSpecificPegboardKit && !(pegboardType && pegboardColor && actualLength)) {
        // Add separate color component for legacy configurations
        await addItemToBOMRecursive('T-OA-PB-COLOR', 1, 'PEGBOARD_COLOR', bom, new Set())
      }
      
      // Pegboard size logic (legacy support) - only when no specific kit is used
      if ((pegboardType || pegboardTypeId) && !hasAddedSpecificPegboardKit) {
        if (pegboardSizePartNumber) {
          if (pegboardSizePartNumber.startsWith('720.215.002 T2-ADW-PB-')) {
            // Custom pegboard size - parse dimensions
            const dimensions = pegboardSizePartNumber.substring('720.215.002 T2-ADW-PB-'.length).split('x')
            if (dimensions.length === 2) {
              const width = parseInt(dimensions[0])
              const length = parseInt(dimensions[1])
              
              // Generate using new service
              const customPart = await CustomPartNumberGenerator.generate({
                type: 'pegboard',
                width,
                length
              })
              
              const bomItem: BOMItem = {
                id: customPart.partNumber,
                partNumber: customPart.partNumber,
                name: CustomPartNumberGenerator.generateDisplayName(customPart.spec),
                quantity: 1,
                category: 'PEGBOARD_PANEL',
                type: 'CUSTOM',
                components: [],
                isCustom: true,
                customPartSpec: customPart.spec,
                customGeneratedPartNumber: customPart.partNumber
              } as any
              
              bom.push(bomItem)
            }
          } else {
            // Standard pegboard size assembly
            await addItemToBOMRecursive(pegboardSizePartNumber, 1, 'PEGBOARD_SIZE', bom, new Set())
          }
        } else if (!(pegboardType && actualLength)) {
          // Auto-select pegboard size based on sink length (legacy - only when no specific kit is used)
          const pegboardSizeId = getPegboardSizeByLength(actualLength!)
          if (pegboardSizeId) {
            console.log(`Legacy pegboard size fallback: ${pegboardSizeId}`)
            await addItemToBOMRecursive(pegboardSizeId, 1, 'PEGBOARD_SIZE_AUTO', bom, new Set())
          }
        }
      }
    }

    // 6. Drawers & Compartments
    if (drawersAndCompartments && drawersAndCompartments.length > 0) {
      console.log(`Adding ${drawersAndCompartments.length} drawer/compartment items for build ${buildNumber}:`, drawersAndCompartments)
      for (const drawerCompartmentId of drawersAndCompartments) {
        await addItemToBOMRecursive(drawerCompartmentId, 1, 'DRAWER_COMPARTMENT', bom, new Set())
      }
    }

    // 7. Basin Assemblies
    if (basins && basins.length > 0) {
      // First, count each basin type to aggregate quantities
      const basinTypeCounts = new Map<string, number>()
      
      for (const basin of basins) {
        if (basin.basinTypeId) {
          const currentCount = basinTypeCounts.get(basin.basinTypeId) || 0
          basinTypeCounts.set(basin.basinTypeId, currentCount + 1)
        }
      }
      
      // Add each unique basin type with its total quantity
      for (const [basinTypeId, quantity] of basinTypeCounts) {
        await addItemToBOMRecursive(basinTypeId, quantity, 'BASIN_TYPE_KIT', bom, new Set())
      }
      
      // Process basin sizes and addons (individual processing needed)
      for (const basin of basins) {
        if (basin.basinSizePartNumber) {
          if (basin.basinSizePartNumber.startsWith('720.215.001 T2-ADW-BASIN-')) {
            // Custom basin size - parse dimensions
            const dimensions = basin.basinSizePartNumber.substring('720.215.001 T2-ADW-BASIN-'.length).split('x')
            if (dimensions.length === 3) {
              const width = parseInt(dimensions[0])
              const length = parseInt(dimensions[1])
              const depth = parseInt(dimensions[2])
              
              // Generate using new service
              const customPart = await CustomPartNumberGenerator.generate({
                type: 'basin',
                width,
                length,
                depth
              })
              
              const bomItem: BOMItem = {
                id: customPart.partNumber,
                partNumber: customPart.partNumber,
                name: CustomPartNumberGenerator.generateDisplayName(customPart.spec),
                quantity: 1,
                category: 'BASIN_PANEL',
                type: 'CUSTOM',
                components: [],
                isCustom: true,
                customPartSpec: customPart.spec,
                customGeneratedPartNumber: customPart.partNumber
              } as any
              
              bom.push(bomItem)
            }
          } else {
            await addItemToBOMRecursive(basin.basinSizePartNumber, 1, 'BASIN_SIZE_ASSEMBLY', bom, new Set())
          }
        }

        if (basin.addonIds && basin.addonIds.length > 0) {
          for (const addonId of basin.addonIds) {
            await addItemToBOMRecursive(addonId, 1, 'BASIN_ADDON', bom, new Set())
          }
        }
      }
    }
    
    // 8. Control Box (Auto-select based on basin types - only when configuration is complete)
    const isConfigurationComplete = isSinkConfigurationComplete(config)
    if (isConfigurationComplete) {
      const autoControlBoxId = controlBoxId || getAutoControlBoxId(basins || [])
      if (autoControlBoxId) {
        const controlBoxesWithDynamicComponents = [
          'T2-CTRL-EDR1', 'T2-CTRL-ESK1', 'T2-CTRL-EDR1-ESK1',
          'T2-CTRL-EDR2', 'T2-CTRL-ESK2', 'T2-CTRL-EDR1-ESK2',
          'T2-CTRL-EDR2-ESK1', 'T2-CTRL-EDR3', 'T2-CTRL-ESK3'
        ]
        
        if (controlBoxesWithDynamicComponents.includes(autoControlBoxId)) {
          await addControlBoxWithDynamicComponents(autoControlBoxId, 1, 'CONTROL_BOX', bom, new Set())
        } else {
          await addItemToBOMRecursive(autoControlBoxId, 1, 'CONTROL_BOX', bom, new Set())
        }
      }
    }

    // 9. Faucets (handle both single and array format + auto-selection)
    // Auto-select faucets for E-Sink DI basins
    const autoSelectedFaucets = getAutoSelectedFaucets(basins || [])
    for (const autoFaucet of autoSelectedFaucets) {
      await addItemToBOMRecursive(autoFaucet.faucetTypeId, autoFaucet.quantity, 'FAUCET_AUTO', bom, new Set())
    }
    
    // User-selected faucets
    if (faucets && faucets.length > 0) {
      for (const faucet of faucets) {
        if (faucet.faucetTypeId) {
          await addItemToBOMRecursive(faucet.faucetTypeId, 1, 'FAUCET_KIT', bom, new Set())
        }
      }
    } else if (faucetTypeId) {
      // Legacy single faucet format
      await addItemToBOMRecursive(faucetTypeId, faucetQuantity || 1, 'FAUCET_KIT', bom, new Set())
    }

    // 10. Sprayers (handle both single and array format)
    if (sprayers && sprayers.length > 0) {
      // New array format
      for (const sprayerItem of sprayers) {
        if (sprayerItem.sprayerTypeId) {
          await addItemToBOMRecursive(sprayerItem.sprayerTypeId, 1, 'SPRAYER_KIT', bom, new Set())
        }
      }
    } else if (sprayer && sprayerTypeIds && sprayerTypeIds.length > 0) {
      // Legacy array of IDs format
      for (const sprayerId of sprayerTypeIds) {
        await addItemToBOMRecursive(sprayerId, 1, 'SPRAYER_KIT', bom, new Set())
      }
    }
  }
  
  // 11. Accessories
  if (orderAccessories) {
    for (const buildNumber of buildNumbers) {
      const buildAccessories = orderAccessories[buildNumber]
      if (buildAccessories) {
        for (const acc of buildAccessories) {
          if (acc.assemblyId && acc.quantity > 0) {
            await addItemToBOMRecursive(acc.assemblyId, acc.quantity, 'ACCESSORY', bom, new Set())
          }
        }
      }
    }
  }

  // 12. Return hierarchical BOM structure
  console.log(`🔧 BOM Service: Generated BOM with ${bom.length} top-level items`)
  
  // Debug hierarchical structure depth
  function countHierarchicalDepth(items: BOMItem[]): { maxDepth: number, itemCounts: Record<number, number> } {
    const itemCounts: Record<number, number> = {}
    let maxDepth = 0
    
    function analyzeDepth(bomItems: BOMItem[], currentLevel = 0) {
      bomItems.forEach(item => {
        const level = item.level !== undefined ? item.level : currentLevel
        maxDepth = Math.max(maxDepth, level)
        itemCounts[level] = (itemCounts[level] || 0) + 1
        
        const children = item.components || item.children || []
        if (children.length > 0) {
          analyzeDepth(children, level + 1)
        }
      })
    }
    
    analyzeDepth(items)
    return { maxDepth, itemCounts }
  }
  
  const hierarchicalAnalysis = countHierarchicalDepth(bom)
  console.log(`🔧 BOM Service: Hierarchical structure - Max depth: ${hierarchicalAnalysis.maxDepth}, Items per level:`, hierarchicalAnalysis.itemCounts)
  
  // Return both hierarchical and flattened versions for different display needs
  const flattenedBOM = flattenBOMForDisplay(bom)
  
  return {
    hierarchical: bom,           // Full nested structure for detailed views
    flattened: flattenedBOM,     // Flattened with indentation for simple display
    totalItems: flattenedBOM.length,
    topLevelItems: bom.length
  }
  
  } catch (error) {
    console.error('❌ BOM Service: Error during BOM generation:', error)
    console.error('❌ BOM Service: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`BOM Generation Failed: ${error.message}`)
    } else {
      throw new Error(`BOM Generation Failed: Unknown error occurred`)
    }
  }
}

