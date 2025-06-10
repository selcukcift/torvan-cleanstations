/**
 * Hierarchical BOM Expander using assemblies.json and parts.json
 * This module provides complete hierarchy expansion for all assembly items
 */

import fs from 'fs'
import path from 'path'

interface AssemblyComponent {
  part_id: string
  quantity: number
  notes?: string
}

interface AssemblyDefinition {
  name: string
  type: string
  category_code?: string
  subcategory_code?: string
  can_order: boolean
  is_kit: boolean
  status: string
  components: AssemblyComponent[]
}

interface PartDefinition {
  name: string
  manufacturer_part_number?: string
  manufacturer_info?: string
  type: string
  status: string
}

interface HierarchicalBOMItem {
  id: string
  name: string
  type: string
  category: string
  quantity: number
  components?: HierarchicalBOMItem[]
  level?: number
  isAssembly: boolean
  isPart: boolean
  manufacturer?: string
  description?: string
}

class HierarchicalBomExpander {
  private assemblies: Record<string, AssemblyDefinition> = {}
  private parts: Record<string, PartDefinition> = {}
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      // Load assemblies.json
      const assembliesPath = path.join(process.cwd(), 'resources', 'assemblies.json')
      const assembliesData = JSON.parse(fs.readFileSync(assembliesPath, 'utf-8'))
      this.assemblies = assembliesData.assemblies

      // Load parts.json
      const partsPath = path.join(process.cwd(), 'resources', 'parts.json')
      const partsData = JSON.parse(fs.readFileSync(partsPath, 'utf-8'))
      this.parts = partsData.parts

      this.initialized = true
      console.log(`🔧 HierarchicalBomExpander: Loaded ${Object.keys(this.assemblies).length} assemblies and ${Object.keys(this.parts).length} parts`)
    } catch (error) {
      console.error('❌ Failed to initialize HierarchicalBomExpander:', error)
      this.initialized = false
    }
  }

  /**
   * Expand a single item (assembly or part) to its complete hierarchy
   */
  public expandItem(itemId: string, quantity: number = 1, level: number = 0, visited: Set<string> = new Set()): HierarchicalBOMItem | null {
    if (!this.initialized) {
      console.warn('⚠️ HierarchicalBomExpander not initialized')
      return null
    }

    // Prevent infinite recursion
    const visitKey = `${itemId}-${level}`
    if (visited.has(visitKey)) {
      console.warn(`⚠️ Circular reference detected: ${itemId} at level ${level}`)
      return null
    }
    visited.add(visitKey)

    // Check if it's an assembly first
    if (this.assemblies[itemId]) {
      return this.expandAssembly(itemId, quantity, level, new Set(visited))
    }

    // Special case: Check for pegboard kits without color that need fallback to colored variants
    if (itemId.includes('T2-ADW-PB-') && itemId.includes('-KIT') && !this.assemblies[itemId]) {
      const fallbackAssembly = this.findPegboardKitFallback(itemId)
      if (fallbackAssembly) {
        console.log(`🔧 Using fallback for ${itemId} -> ${fallbackAssembly}`)
        return this.expandAssembly(fallbackAssembly, quantity, level, new Set(visited))
      }
    }

    // Check if it's a part
    if (this.parts[itemId]) {
      return this.expandPart(itemId, quantity, level)
    }

    // Unknown item
    console.warn(`⚠️ Unknown item: ${itemId}`)
    return {
      id: itemId,
      name: `Unknown Item: ${itemId}`,
      type: 'UNKNOWN',
      category: 'UNKNOWN',
      quantity,
      level,
      isAssembly: false,
      isPart: false,
      components: []
    }
  }

  /**
   * Find a fallback colored variant for pegboard kits without color
   */
  private findPegboardKitFallback(itemId: string): string | null {
    // Extract the base pattern (e.g., T2-ADW-PB-7236-PERF-KIT)
    const pattern = itemId.replace('-KIT', '')
    
    // Look for any colored variant with this pattern
    const colors = ['GREEN', 'BLACK', 'BLUE', 'WHITE', 'GREY', 'RED', 'YELLOW', 'ORANGE']
    
    for (const color of colors) {
      const coloredVariant = `${pattern}-${color}-KIT`
      if (this.assemblies[coloredVariant]) {
        return coloredVariant
      }
    }
    
    return null
  }

  /**
   * Expand an assembly to its complete component hierarchy
   */
  private expandAssembly(assemblyId: string, quantity: number, level: number, visited: Set<string>): HierarchicalBOMItem {
    const assembly = this.assemblies[assemblyId]
    
    const assemblyItem: HierarchicalBOMItem = {
      id: assemblyId,
      name: assembly.name,
      type: assembly.type,
      category: assembly.category_code || 'ASSEMBLY',
      quantity,
      level,
      isAssembly: true,
      isPart: false,
      components: []
    }

    // Expand all components
    if (assembly.components && assembly.components.length > 0) {
      for (const component of assembly.components) {
        const expandedComponent = this.expandItem(
          component.part_id, 
          component.quantity * quantity, // Multiply by parent quantity
          level + 1, 
          new Set(visited)
        )
        
        if (expandedComponent) {
          assemblyItem.components!.push(expandedComponent)
        }
      }
    }

    return assemblyItem
  }

  /**
   * Expand a part (leaf node in hierarchy)
   */
  private expandPart(partId: string, quantity: number, level: number): HierarchicalBOMItem {
    const part = this.parts[partId]
    
    return {
      id: partId,
      name: part.name,
      type: part.type || 'COMPONENT',
      category: 'PART',
      quantity,
      level,
      isAssembly: false,
      isPart: true,
      manufacturer: part.manufacturer_info || undefined,
      description: part.name
    }
  }

  /**
   * Expand a complete BOM list to show all hierarchies
   */
  public expandBOMList(bomItems: any[]): HierarchicalBOMItem[] {
    if (!this.initialized) {
      console.warn('⚠️ HierarchicalBomExpander not initialized, returning original items')
      return bomItems
    }

    const expandedItems: HierarchicalBOMItem[] = []

    for (const item of bomItems) {
      const itemId = item.id || item.assemblyId || item.partNumber
      const quantity = item.quantity || 1
      
      const expandedItem = this.expandItem(itemId, quantity, 0)
      if (expandedItem) {
        expandedItems.push(expandedItem)
      }
    }

    return expandedItems
  }

  /**
   * Get assembly depth (for analysis)
   */
  public getAssemblyDepth(assemblyId: string, visited: Set<string> = new Set()): number {
    if (!this.assemblies[assemblyId] || visited.has(assemblyId)) {
      return 0
    }

    visited.add(assemblyId)
    const assembly = this.assemblies[assemblyId]
    
    if (!assembly.components || assembly.components.length === 0) {
      return 0
    }

    let maxDepth = 0
    for (const component of assembly.components) {
      if (this.assemblies[component.part_id]) {
        const depth = 1 + this.getAssemblyDepth(component.part_id, new Set(visited))
        maxDepth = Math.max(maxDepth, depth)
      }
    }

    return maxDepth
  }

  /**
   * Check if an item is an assembly
   */
  public isAssembly(itemId: string): boolean {
    return !!this.assemblies[itemId]
  }

  /**
   * Check if an item is a part
   */
  public isPart(itemId: string): boolean {
    return !!this.parts[itemId]
  }

  /**
   * Get all assemblies with deep hierarchies (2+ levels)
   */
  public getDeepAssemblies(): Array<{id: string, name: string, depth: number}> {
    const deepAssemblies: Array<{id: string, name: string, depth: number}> = []
    
    for (const [assemblyId, assembly] of Object.entries(this.assemblies)) {
      const depth = this.getAssemblyDepth(assemblyId)
      if (depth >= 2) {
        deepAssemblies.push({
          id: assemblyId,
          name: assembly.name,
          depth
        })
      }
    }

    return deepAssemblies.sort((a, b) => b.depth - a.depth)
  }
}

// Export singleton instance
export const hierarchicalBomExpander = new HierarchicalBomExpander()
export type { HierarchicalBOMItem }