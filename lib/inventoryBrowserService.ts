/**
 * Standalone Inventory Browser Service
 * 
 * This service provides hierarchical inventory browsing capabilities
 * for procurement users. It operates independently from BOM generation
 * and order processing logic.
 */

interface PartInfo {
  id: string
  name: string
  manufacturerPartNumber?: string
  manufacturerInfo?: string
  type: string
  status: string
}

interface AssemblyInfo {
  id: string
  name: string
  type: string
  categoryCode?: string
  subcategoryCode?: string
  canOrder: boolean
  isKit: boolean
  status: string
  components: ComponentReference[]
}

interface ComponentReference {
  id: string
  name: string
  quantity: number
  type: 'PART' | 'ASSEMBLY'
  parentAssemblyId: string
}

interface CategoryInfo {
  id: string
  name: string
  description: string
  subcategories: SubcategoryInfo[]
}

interface SubcategoryInfo {
  id: string
  name: string
  description: string
  categoryId: string
  assemblyRefs: string[]
}

interface InventoryHierarchy {
  categories: CategoryInfo[]
  assemblies: Map<string, AssemblyInfo>
  parts: Map<string, PartInfo>
  assemblyUsage: Map<string, string[]> // partId -> assemblyIds that use it
  categoryAssemblies: Map<string, AssemblyInfo[]> // categoryId -> assemblies
}

class InventoryBrowserService {
  private hierarchy: InventoryHierarchy | null = null
  private initialized = false

  /**
   * Initialize the service with data from JSON files
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load data from JSON files
      const [partsData, assembliesData, categoriesData] = await Promise.all([
        this.loadPartsData(),
        this.loadAssembliesData(),
        this.loadCategoriesData()
      ])

      this.hierarchy = this.buildHierarchy(partsData, assembliesData, categoriesData)
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize inventory browser service:', error)
      throw new Error('Could not load inventory data')
    }
  }

  /**
   * Load parts data from JSON
   */
  private async loadPartsData(): Promise<any> {
    try {
      if (typeof window !== 'undefined') {
        // Client-side: fetch from API or return empty data
        return { parts: {} }
      }
      
      const fs = await import('fs/promises')
      const path = await import('path')
      const partsPath = path.join(process.cwd(), 'resources', 'parts.json')
      const data = await fs.readFile(partsPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading parts.json:', error)
      return { parts: {} }
    }
  }

  /**
   * Load assemblies data from JSON
   */
  private async loadAssembliesData(): Promise<any> {
    try {
      if (typeof window !== 'undefined') {
        // Client-side: fetch from API or return empty data
        return { assemblies: {} }
      }
      
      const fs = await import('fs/promises')
      const path = await import('path')
      const assembliesPath = path.join(process.cwd(), 'resources', 'assemblies.json')
      const data = await fs.readFile(assembliesPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading assemblies.json:', error)
      return { assemblies: {} }
    }
  }

  /**
   * Load categories data from JSON
   */
  private async loadCategoriesData(): Promise<any> {
    try {
      if (typeof window !== 'undefined') {
        // Client-side: fetch from API or return empty data
        return { categories: {} }
      }
      
      const fs = await import('fs/promises')
      const path = await import('path')
      const categoriesPath = path.join(process.cwd(), 'resources', 'categories.json')
      const data = await fs.readFile(categoriesPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading categories.json:', error)
      return { categories: {} }
    }
  }

  /**
   * Build the complete hierarchy from loaded data
   */
  private buildHierarchy(partsData: any, assembliesData: any, categoriesData: any): InventoryHierarchy {
    // Process parts
    const parts = new Map<string, PartInfo>()
    for (const [partId, partData] of Object.entries(partsData.parts || {})) {
      parts.set(partId, {
        id: partId,
        name: (partData as any).name || '',
        manufacturerPartNumber: (partData as any).manufacturer_part_number,
        manufacturerInfo: (partData as any).manufacturer_info,
        type: (partData as any).type || 'COMPONENT',
        status: (partData as any).status || 'ACTIVE'
      })
    }

    // Process assemblies
    const assemblies = new Map<string, AssemblyInfo>()
    const assemblyUsage = new Map<string, string[]>()

    for (const [assemblyId, assemblyData] of Object.entries(assembliesData.assemblies || {})) {
      const assembly: AssemblyInfo = {
        id: assemblyId,
        name: (assemblyData as any).name || '',
        type: (assemblyData as any).type || 'ASSEMBLY',
        categoryCode: (assemblyData as any).category_code,
        subcategoryCode: (assemblyData as any).subcategory_code,
        canOrder: (assemblyData as any).can_order || false,
        isKit: (assemblyData as any).is_kit || false,
        status: (assemblyData as any).status || 'ACTIVE',
        components: []
      }

      // Process components
      const components = (assemblyData as any).components || []
      for (const component of components) {
        const componentRef: ComponentReference = {
          id: component.id || component.part_id || component.assembly_id,
          name: component.name || '',
          quantity: component.quantity || 1,
          type: component.type === 'PART' ? 'PART' : 'ASSEMBLY',
          parentAssemblyId: assemblyId
        }
        assembly.components.push(componentRef)

        // Track usage
        if (componentRef.id) {
          if (!assemblyUsage.has(componentRef.id)) {
            assemblyUsage.set(componentRef.id, [])
          }
          assemblyUsage.get(componentRef.id)!.push(assemblyId)
        }
      }

      assemblies.set(assemblyId, assembly)
    }

    // Process categories
    const categories: CategoryInfo[] = []
    const categoryAssemblies = new Map<string, AssemblyInfo[]>()

    for (const [categoryId, categoryData] of Object.entries(categoriesData.categories || {})) {
      const subcategories: SubcategoryInfo[] = []

      // Process subcategories
      const subcategoriesData = (categoryData as any).subcategories || {}
      for (const [subcategoryId, subcategoryData] of Object.entries(subcategoriesData)) {
        const assemblyRefs = (subcategoryData as any).assembly_refs || []
        
        subcategories.push({
          id: subcategoryId,
          name: (subcategoryData as any).name || '',
          description: (subcategoryData as any).description || '',
          categoryId: categoryId,
          assemblyRefs: assemblyRefs
        })
      }

      const category: CategoryInfo = {
        id: categoryId,
        name: (categoryData as any).name || '',
        description: (categoryData as any).description || '',
        subcategories: subcategories
      }

      categories.push(category)

      // Map assemblies to categories
      const categoryAssemblyList: AssemblyInfo[] = []
      for (const subcategory of subcategories) {
        for (const assemblyRef of subcategory.assemblyRefs) {
          const assembly = assemblies.get(assemblyRef)
          if (assembly) {
            categoryAssemblyList.push(assembly)
          }
        }
      }
      categoryAssemblies.set(categoryId, categoryAssemblyList)
    }

    return {
      categories,
      assemblies,
      parts,
      assemblyUsage,
      categoryAssemblies
    }
  }

  /**
   * Get the complete category hierarchy
   */
  async getCategoryHierarchy(): Promise<CategoryInfo[]> {
    await this.initialize()
    return this.hierarchy?.categories || []
  }

  /**
   * Get assembly details by ID
   */
  async getAssemblyDetails(assemblyId: string): Promise<AssemblyInfo | null> {
    await this.initialize()
    return this.hierarchy?.assemblies.get(assemblyId) || null
  }

  /**
   * Get part details by ID
   */
  async getPartDetails(partId: string): Promise<PartInfo | null> {
    await this.initialize()
    return this.hierarchy?.parts.get(partId) || null
  }

  /**
   * Get assemblies that use a specific part
   */
  async getPartUsage(partId: string): Promise<AssemblyInfo[]> {
    await this.initialize()
    const assemblyIds = this.hierarchy?.assemblyUsage.get(partId) || []
    const assemblies: AssemblyInfo[] = []
    
    for (const assemblyId of assemblyIds) {
      const assembly = this.hierarchy?.assemblies.get(assemblyId)
      if (assembly) {
        assemblies.push(assembly)
      }
    }
    
    return assemblies
  }

  /**
   * Get all assemblies in a category
   */
  async getCategoryAssemblies(categoryId: string): Promise<AssemblyInfo[]> {
    await this.initialize()
    return this.hierarchy?.categoryAssemblies.get(categoryId) || []
  }

  /**
   * Search for parts and assemblies
   */
  async search(query: string): Promise<{ parts: PartInfo[], assemblies: AssemblyInfo[] }> {
    await this.initialize()
    
    const searchTerm = query.toLowerCase()
    const matchingParts: PartInfo[] = []
    const matchingAssemblies: AssemblyInfo[] = []

    // Search parts
    this.hierarchy?.parts.forEach((part) => {
      if (part.name.toLowerCase().includes(searchTerm) || 
          part.id.toLowerCase().includes(searchTerm) ||
          part.manufacturerPartNumber?.toLowerCase().includes(searchTerm)) {
        matchingParts.push(part)
      }
    })

    // Search assemblies
    this.hierarchy?.assemblies.forEach((assembly) => {
      if (assembly.name.toLowerCase().includes(searchTerm) || 
          assembly.id.toLowerCase().includes(searchTerm)) {
        matchingAssemblies.push(assembly)
      }
    })

    return { parts: matchingParts, assemblies: matchingAssemblies }
  }

  /**
   * Get flat list of all components in an assembly (recursive)
   */
  async getFlattenedAssemblyComponents(assemblyId: string): Promise<ComponentReference[]> {
    await this.initialize()
    const components: ComponentReference[] = []
    const visited = new Set<string>()

    const collectComponents = (currentAssemblyId: string) => {
      if (visited.has(currentAssemblyId)) return
      visited.add(currentAssemblyId)

      const assembly = this.hierarchy?.assemblies.get(currentAssemblyId)
      if (!assembly) return

      for (const component of assembly.components) {
        components.push(component)
        
        // If component is an assembly, recursively collect its components
        if (component.type === 'ASSEMBLY') {
          collectComponents(component.id)
        }
      }
    }

    collectComponents(assemblyId)
    return components
  }

  /**
   * Get statistics for the inventory
   */
  async getInventoryStats(): Promise<{
    totalCategories: number
    totalSubcategories: number
    totalAssemblies: number
    totalParts: number
    totalComponents: number
  }> {
    await this.initialize()
    
    let totalSubcategories = 0
    this.hierarchy?.categories.forEach(category => {
      totalSubcategories += category.subcategories.length
    })

    let totalComponents = 0
    this.hierarchy?.assemblies.forEach(assembly => {
      totalComponents += assembly.components.length
    })

    return {
      totalCategories: this.hierarchy?.categories.length || 0,
      totalSubcategories,
      totalAssemblies: this.hierarchy?.assemblies.size || 0,
      totalParts: this.hierarchy?.parts.size || 0,
      totalComponents
    }
  }
}

// Export singleton instance
export const inventoryBrowserService = new InventoryBrowserService()

// Export types for use in components
export type {
  PartInfo,
  AssemblyInfo,
  ComponentReference,
  CategoryInfo,
  SubcategoryInfo,
  InventoryHierarchy
}