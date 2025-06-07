/**
 * Native TypeScript Accessories Service
 * Implements accessory catalog logic from categories.json and assemblies.json
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AccessoryCategory {
  id: string
  name: string
  description?: string
  code: string
}

interface Accessory {
  id: string
  name: string
  description?: string
  type: string
  categoryCode: string
  subcategoryCode?: string
  kitComponentsJson?: string
  photoURL?: string
  available: boolean
}

/**
 * Get accessory categories (subcategories under "ACCESSORY LIST" category "720")
 */
export async function getAccessoryCategories(): Promise<AccessoryCategory[]> {
  try {
    // Find subcategories under category ID '720' (ACCESSORY LIST)
    const categories = await prisma.subcategory.findMany({
      where: {
        categoryId: '720'
      },
      select: {
        subcategoryId: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    })
    
    return categories.map(category => ({
      id: category.subcategoryId,
      name: category.name,
      description: category.description || undefined,
      code: category.subcategoryId
    }))
  } catch (error) {
    console.error('Error fetching accessory categories:', error)
    throw new Error('Failed to fetch accessory categories')
  }
}

/**
 * Get accessories by specific category
 */
export async function getAccessoriesByCategory(categoryCode: string): Promise<Accessory[]> {
  try {
    const accessories = await prisma.assembly.findMany({
      where: {
        subcategoryCode: categoryCode,
        type: { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] }, // Filter accessory types
      },
      select: {
        assemblyId: true,
        name: true,
        type: true,
        categoryCode: true,
        subcategoryCode: true,
        kitComponentsJson: true
      },
      orderBy: { name: 'asc' }
    })

    return accessories.map(accessory => ({
      id: accessory.assemblyId,
      name: accessory.name,
      description: undefined, // Could be derived from kitComponentsJson if needed
      type: accessory.type,
      categoryCode: accessory.categoryCode || '',
      subcategoryCode: accessory.subcategoryCode || undefined,
      kitComponentsJson: accessory.kitComponentsJson || undefined,
      photoURL: undefined, // Could be added if photo URLs are available
      available: true
    }))
  } catch (error) {
    console.error('Error fetching accessories by category:', error)
    throw new Error('Failed to fetch accessories')
  }
}

/**
 * Get all accessories across all categories
 */
export async function getAllAccessories(options: {
  limit?: number
  offset?: number
  featured?: boolean
  search?: string
} = {}): Promise<{
  accessories: Accessory[]
  total: number
  hasMore: boolean
}> {
  try {
    const { limit = 50, offset = 0, featured = false, search } = options

    const whereClause: any = {
      categoryCode: '720', // ACCESSORY LIST category
      type: { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] }
    }

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assemblyId: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Featured logic could be implemented based on specific criteria
    if (featured) {
      // For now, just limit to popular subcategories
      whereClause.subcategoryCode = {
        in: ['720.702', '720.703', '720.704', '720.705'] // Storage, Lighting, Organization, Dispensers
      }
    }

    const [accessories, total] = await Promise.all([
      prisma.assembly.findMany({
        where: whereClause,
        select: {
          assemblyId: true,
          name: true,
          type: true,
          categoryCode: true,
          subcategoryCode: true,
          kitComponentsJson: true
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset
      }),
      prisma.assembly.count({ where: whereClause })
    ])

    return {
      accessories: accessories.map(accessory => ({
        id: accessory.assemblyId,
        name: accessory.name,
        description: undefined,
        type: accessory.type,
        categoryCode: accessory.categoryCode || '',
        subcategoryCode: accessory.subcategoryCode || undefined,
        kitComponentsJson: accessory.kitComponentsJson || undefined,
        photoURL: undefined,
        available: true
      })),
      total,
      hasMore: offset + limit < total
    }
  } catch (error) {
    console.error('Error fetching all accessories:', error)
    throw new Error('Failed to fetch accessories')
  }
}

/**
 * Search accessories by name or ID
 */
export async function searchAccessories(query: string, options: {
  limit?: number
  categoryCode?: string
} = {}): Promise<Accessory[]> {
  try {
    const { limit = 20, categoryCode } = options

    const whereClause: any = {
      categoryCode: categoryCode || '720', // Default to ACCESSORY LIST
      type: { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { assemblyId: { contains: query, mode: 'insensitive' } }
      ]
    }

    const accessories = await prisma.assembly.findMany({
      where: whereClause,
      select: {
        assemblyId: true,
        name: true,
        type: true,
        categoryCode: true,
        subcategoryCode: true,
        kitComponentsJson: true
      },
      orderBy: { name: 'asc' },
      take: limit
    })

    return accessories.map(accessory => ({
      id: accessory.assemblyId,
      name: accessory.name,
      description: undefined,
      type: accessory.type,
      categoryCode: accessory.categoryCode || '',
      subcategoryCode: accessory.subcategoryCode || undefined,
      kitComponentsJson: accessory.kitComponentsJson || undefined,
      photoURL: undefined,
      available: true
    }))
  } catch (error) {
    console.error('Error searching accessories:', error)
    throw new Error('Failed to search accessories')
  }
}

/**
 * Get featured accessories (commonly used ones)
 */
export async function getFeaturedAccessories(limit: number = 12): Promise<Accessory[]> {
  try {
    // Featured accessories are from popular categories
    const featuredCategories = ['720.702', '720.703', '720.704', '720.705']
    
    const accessories = await prisma.assembly.findMany({
      where: {
        subcategoryCode: { in: featuredCategories },
        type: { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] }
      },
      select: {
        assemblyId: true,
        name: true,
        type: true,
        categoryCode: true,
        subcategoryCode: true,
        kitComponentsJson: true
      },
      orderBy: { name: 'asc' },
      take: limit
    })

    return accessories.map(accessory => ({
      id: accessory.assemblyId,
      name: accessory.name,
      description: undefined,
      type: accessory.type,
      categoryCode: accessory.categoryCode || '',
      subcategoryCode: accessory.subcategoryCode || undefined,
      kitComponentsJson: accessory.kitComponentsJson || undefined,
      photoURL: undefined,
      available: true
    }))
  } catch (error) {
    console.error('Error fetching featured accessories:', error)
    throw new Error('Failed to fetch featured accessories')
  }
}

const accessoriesService = {
  getAccessoryCategories,
  getAccessoriesByCategory,
  getAllAccessories,
  searchAccessories,
  getFeaturedAccessories
}

export default accessoriesService