// Server-safe BOM aggregation utilities (no jsPDF dependencies)

export interface BOMItem {
  assemblyId?: string
  id?: string
  partIdOrAssemblyId?: string
  partNumber?: string
  name: string
  description?: string
  quantity: number
  category?: string
  itemType?: string
  isCustom?: boolean
  parentId?: string
}

export interface AggregatedBOMItem {
  partNumber: string
  description: string
  quantity: number
  category: string
  sources: string[]
}

export interface OrderInfo {
  poNumber: string
  customerName: string
  orderDate?: string | Date
  wantDate?: string | Date
  projectName?: string
  salesPerson?: string
  buildNumbers?: string[]
}

/**
 * Aggregates BOM items by part number, combining quantities
 */
export function aggregateBOMItems(bomItems: BOMItem[]): AggregatedBOMItem[] {
  const aggregated = new Map<string, AggregatedBOMItem>()

  bomItems.forEach(item => {
    // Get the part number from various possible fields
    const partNumber = item.partNumber || 
                      item.assemblyId || 
                      item.partIdOrAssemblyId || 
                      item.id || 
                      'UNKNOWN'

    const description = item.description || item.name || partNumber
    const category = item.category || item.itemType || 'UNCATEGORIZED'
    const source = item.itemType || 'UNKNOWN'

    if (aggregated.has(partNumber)) {
      const existing = aggregated.get(partNumber)!
      existing.quantity += item.quantity
      if (!existing.sources.includes(source)) {
        existing.sources.push(source)
      }
    } else {
      aggregated.set(partNumber, {
        partNumber,
        description,
        quantity: item.quantity,
        category: category.toUpperCase(),
        sources: [source]
      })
    }
  })

  // Convert to array and sort by category, then by part number
  return Array.from(aggregated.values()).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return a.partNumber.localeCompare(b.partNumber)
  })
}

/**
 * Category priority for sorting (most important first)
 */
const CATEGORY_PRIORITY: Record<string, number> = {
  'SINK': 1,
  'BASIN': 2,
  'LEGS': 3,
  'FEET': 4,
  'PEGBOARD': 5,
  'FAUCET': 6,
  'SPRAYER': 7,
  'CONTROL': 8,
  'ACCESSORY': 9,
  'HARDWARE': 10,
  'UNCATEGORIZED': 999
}

/**
 * Enhanced sort function that considers category priority
 */
export function sortBOMItemsByPriority(items: AggregatedBOMItem[]): AggregatedBOMItem[] {
  return items.sort((a, b) => {
    const aPriority = CATEGORY_PRIORITY[a.category] || 999
    const bPriority = CATEGORY_PRIORITY[b.category] || 999
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    
    return a.partNumber.localeCompare(b.partNumber)
  })
}