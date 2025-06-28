/**
 * Assembly Mapper Utility
 * 
 * This utility provides enhanced fallback logic for assembly ID resolution
 * to prevent "unknown" parts from appearing in BOMs. It uses the resource
 * files as a fallback source of truth.
 */

import fs from 'fs'
import path from 'path'

interface AssemblyMapping {
  generic_to_specific_mappings: {
    [key: string]: {
      specific_options: string[]
      description: string
      default_recommendation: string
    }
  }
}

interface ResourceAssembly {
  name: string
  type: string
  category_code: string
  subcategory_code: string
  can_order: boolean
  is_kit: boolean
  status: string
  components: Array<{
    part_id: string
    quantity: number
    notes?: string
  }>
}

class AssemblyMapper {
  private resourceAssemblies: { [key: string]: ResourceAssembly } | null = null
  private assemblyMappings: AssemblyMapping | null = null

  /**
   * Load assembly definitions from resource files
   */
  private loadResourceAssemblies(): { [key: string]: ResourceAssembly } {
    if (this.resourceAssemblies) {
      return this.resourceAssemblies
    }

    try {
      const assembliesPath = path.join(process.cwd(), 'resources', 'assemblies.json')
      const assembliesData = JSON.parse(fs.readFileSync(assembliesPath, 'utf8'))
      this.resourceAssemblies = assembliesData.assemblies || {}
      return this.resourceAssemblies
    } catch (error) {
      console.warn('⚠️ Could not load resource assemblies:', error)
      return {}
    }
  }

  /**
   * Load assembly mappings from the mapping file
   */
  private loadAssemblyMappings(): AssemblyMapping {
    if (this.assemblyMappings) {
      return this.assemblyMappings
    }

    try {
      const mappingsPath = path.join(process.cwd(), 'resources', 'assembly-id-mappings.json')
      this.assemblyMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'))
      return this.assemblyMappings
    } catch (error) {
      console.warn('⚠️ Could not load assembly mappings:', error)
      // Return default mappings if file doesn't exist
      return {
        generic_to_specific_mappings: {
          'HEIGHT-ADJUSTABLE': {
            specific_options: ['T2-DL27-KIT', 'T2-LC1-KIT'],
            description: 'Height adjustable leg systems',
            default_recommendation: 'T2-DL27-KIT'
          },
          'PERFORATED': {
            specific_options: ['T2-ADW-PB-PERF-KIT'],
            description: 'Perforated pegboard systems', 
            default_recommendation: 'T2-ADW-PB-PERF-KIT'
          },
          'STANDARD-PEGBOARD': {
            specific_options: ['T2-ADW-PB-SOLID-KIT'],
            description: 'Solid pegboard systems',
            default_recommendation: 'T2-ADW-PB-SOLID-KIT'
          }
        }
      }
    }
  }

  /**
   * Resolve a generic assembly ID to a specific one
   */
  resolveGenericAssemblyId(assemblyId: string): string {
    const mappings = this.loadAssemblyMappings()
    const mapping = mappings.generic_to_specific_mappings[assemblyId]
    
    if (mapping) {
      console.log(`🔄 Mapping generic assembly ${assemblyId} to ${mapping.default_recommendation}`)
      return mapping.default_recommendation
    }
    
    return assemblyId
  }

  /**
   * Get assembly info from resource files as fallback
   */
  getAssemblyFromResources(assemblyId: string): { id: string, name: string, type: string } | null {
    const assemblies = this.loadResourceAssemblies()
    const assembly = assemblies[assemblyId]
    
    if (assembly) {
      return {
        id: assemblyId,
        name: assembly.name,
        type: assembly.type
      }
    }
    
    return null
  }

  /**
   * Enhanced assembly lookup with fallback chain
   */
  enhancedAssemblyLookup(assemblyId: string): { id: string, name: string, type: string } | null {
    // Step 1: Try the assembly ID as-is from resources
    let assemblyInfo = this.getAssemblyFromResources(assemblyId)
    if (assemblyInfo) {
      return assemblyInfo
    }

    // Step 2: Try to resolve generic ID to specific ID
    const resolvedId = this.resolveGenericAssemblyId(assemblyId)
    if (resolvedId !== assemblyId) {
      assemblyInfo = this.getAssemblyFromResources(resolvedId)
      if (assemblyInfo) {
        console.log(`✅ Resolved ${assemblyId} via mapping to ${resolvedId}`)
        return assemblyInfo
      }
    }

    // Step 3: Return null if no fallback found
    return null
  }

  /**
   * Create a placeholder assembly for unknown IDs with enhanced info
   */
  createPlaceholderAssembly(assemblyId: string, category?: string): {
    id: string
    name: string
    quantity: number
    category: string
    type: string
    components: any[]
    isPlaceholder: boolean
    resolutionSuggestion?: string
  } {
    const mappings = this.loadAssemblyMappings()
    const mapping = mappings.generic_to_specific_mappings[assemblyId]
    
    return {
      id: assemblyId,
      name: mapping 
        ? `Unknown ${mapping.description}: ${assemblyId}` 
        : `Unknown Assembly: ${assemblyId}`,
      quantity: 1,
      category: category || 'UNKNOWN',
      type: 'UNKNOWN',
      components: [],
      isPlaceholder: true,
      resolutionSuggestion: mapping?.default_recommendation
    }
  }
}

// Export singleton instance
export const assemblyMapper = new AssemblyMapper()

// Export types for use in other files
export type { AssemblyMapping, ResourceAssembly }

// Export class for testing
export { AssemblyMapper }