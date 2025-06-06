/**
 * Accessories Service - Dynamic Accessory Data Management
 * Implements accessory catalog logic from categories.json and assemblies.json
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get accessory categories (subcategories under "ACCESSORY LIST" category "720")
 * @returns {Promise<Array>} List of accessory categories
 */
async function getAccessoryCategories() {
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
        });
        
        return categories.map(category => ({
            id: category.subcategoryId,
            name: category.name,
            description: category.description,
            code: category.subcategoryId
        }));
    } catch (error) {
        console.error('Error fetching accessory categories:', error);
        throw new Error('Failed to fetch accessory categories');
    }
}

/**
 * Get accessories by specific category
 * @param {string} categoryCode - Subcategory code (e.g., "720.702")
 * @returns {Promise<Array>} List of accessories in the category
 */
async function getAccessoriesByCategory(categoryCode) {
    try {
        const accessories = await prisma.assembly.findMany({
            where: {
                subcategoryCode: categoryCode,
                type: { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] }, // Filter accessory types
                assemblyId: { 
                    notIn: ['T2-OA-2D-152012-STACKED-KIT', 'T2-OA-PO-SHLF-1212'] // Exclude drawer/compartment items moved to sink body config
                }
            },
            select: {
                assemblyId: true,
                name: true,
                type: true,
                subcategoryCode: true
            },
            orderBy: { name: 'asc' }
        });
        
        return accessories.map(accessory => ({
            id: accessory.assemblyId,
            assemblyId: accessory.assemblyId,
            name: accessory.name,
            type: accessory.type,
            categoryCode: accessory.subcategoryCode,
            displayName: formatAccessoryDisplayName(accessory.name)
        }));
    } catch (error) {
        console.error('Error fetching accessories by category:', error);
        throw new Error('Failed to fetch accessories for category');
    }
}

/**
 * Get all accessories with optional filtering and searching
 * @param {Object} options - Filter and search options
 * @param {string} options.searchTerm - Search term for name/description
 * @param {string} options.categoryFilter - Filter by category code
 * @param {number} options.limit - Limit number of results (default: 50)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<Object>} Paginated list of accessories with metadata
 */
async function getAllAccessories({ searchTerm, categoryFilter, limit = 50, offset = 0 } = {}) {
    try {
        const where = {
            // Only include assemblies from the ACCESSORY LIST category
            subcategoryCode: {
                startsWith: '720.'
            },
            type: { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] },
            assemblyId: { 
                notIn: ['T2-OA-2D-152012-STACKED-KIT', 'T2-OA-PO-SHLF-1212'] // Exclude drawer/compartment items moved to sink body config
            }
        };
        
        if (categoryFilter) {
            where.subcategoryCode = categoryFilter;
        }
        
        if (searchTerm) {
            where.OR = [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { assemblyId: { contains: searchTerm, mode: 'insensitive' } }
            ];
        }
        
        // Get total count for pagination
        const totalCount = await prisma.assembly.count({ where });
        
        // Get paginated results
        const accessories = await prisma.assembly.findMany({
            where,
            select: {
                assemblyId: true,
                name: true,
                type: true,
                subcategoryCode: true
            },
            orderBy: { name: 'asc' },
            take: limit,
            skip: offset
        });
        
        // Get category names for each accessory
        const categoryMap = await getCategoryMap();
        
        const formattedAccessories = accessories.map(accessory => ({
            id: accessory.assemblyId,
            assemblyId: accessory.assemblyId,
            name: accessory.name,
            type: accessory.type,
            categoryCode: accessory.subcategoryCode,
            categoryName: categoryMap[accessory.subcategoryCode] || 'Unknown Category',
            displayName: formatAccessoryDisplayName(accessory.name)
        }));
        
        return {
            accessories: formattedAccessories,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            }
        };
    } catch (error) {
        console.error('Error fetching all accessories:', error);
        throw new Error('Failed to fetch accessories');
    }
}

/**
 * Get accessories grouped by category
 * @returns {Promise<Object>} Accessories organized by category
 */
async function getAccessoriesGroupedByCategory() {
    try {
        // Get all categories first
        const categories = await getAccessoryCategories();
        
        // Get all accessories
        const allAccessories = await prisma.assembly.findMany({
            where: {
                subcategoryCode: {
                    startsWith: '720.'
                },
                type: { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] },
                assemblyId: { 
                    notIn: ['T2-OA-2D-152012-STACKED-KIT', 'T2-OA-PO-SHLF-1212'] // Exclude drawer/compartment items moved to sink body config
                }
            },
            select: {
                assemblyId: true,
                name: true,
                type: true,
                subcategoryCode: true
            },
            orderBy: { name: 'asc' }
        });
        
        // Group accessories by category
        const groupedAccessories = {};
        
        categories.forEach(category => {
            groupedAccessories[category.code] = {
                categoryInfo: category,
                accessories: []
            };
        });
        
        allAccessories.forEach(accessory => {
            if (groupedAccessories[accessory.subcategoryCode]) {
                groupedAccessories[accessory.subcategoryCode].accessories.push({
                    id: accessory.assemblyId,
                    assemblyId: accessory.assemblyId,
                    name: accessory.name,
                    type: accessory.type,
                    displayName: formatAccessoryDisplayName(accessory.name)
                });
            }
        });
        
        return groupedAccessories;
    } catch (error) {
        console.error('Error fetching grouped accessories:', error);
        throw new Error('Failed to fetch grouped accessories');
    }
}

/**
 * Get featured accessories (commonly used ones)
 * Based on business logic from sink configuration document
 * @returns {Promise<Array>} List of featured accessories
 */
async function getFeaturedAccessories() {
    // These are commonly used accessories based on the business requirements
    const featuredAssemblyIds = [
        'T-OA-BINRAIL-24-KIT', // BIN RAIL, 24" KIT
        'T-OA-BINRAIL-36-KIT', // BIN RAIL, 36" KIT
        'T-OA-SSSHELF-1812', // STAINLESS STEEL SLOT SHELF, 18"W X 12"D
        'T-OA-SSSHELF-3612', // STAINLESS STEEL SLOT SHELF, 36"W X 12"D
        'T-OA-1BRUSH-ORG-PB-KIT', // SINGLE BRUSH HOLDER
        'T-OA-6BRUSH-ORG-PB-KIT', // 6 BRUSH ORGANIZER
        'T-OA-PB-SS-1GLOVE', // SINGLE GLOVE DISPENSER
        'T-OA-PB-SS-2GLOVE', // DOUBLE GLOVE DISPENSER
        'T-OA-MLIGHT-PB-KIT', // MAGNIFYING LIGHT
        'T-OA-TASKLIGHT-PB' // LED TASK LIGHT
    ];
    
    try {
        const featuredAccessories = await prisma.assembly.findMany({
            where: {
                assemblyId: { in: featuredAssemblyIds }
            },
            select: {
                assemblyId: true,
                name: true,
                type: true,
                subcategoryCode: true
            }
        });
        
        // Get category names
        const categoryMap = await getCategoryMap();
        
        return featuredAccessories.map(accessory => ({
            id: accessory.assemblyId,
            assemblyId: accessory.assemblyId,
            name: accessory.name,
            type: accessory.type,
            categoryCode: accessory.subcategoryCode,
            categoryName: categoryMap[accessory.subcategoryCode] || 'Unknown Category',
            displayName: formatAccessoryDisplayName(accessory.name),
            featured: true
        }));
    } catch (error) {
        console.error('Error fetching featured accessories:', error);
        throw new Error('Failed to fetch featured accessories');
    }
}

/**
 * Search accessories with advanced filtering
 * @param {Object} filters - Advanced filter options
 * @param {string} filters.query - Search query
 * @param {Array<string>} filters.categories - Array of category codes to filter by
 * @param {Array<string>} filters.types - Array of assembly types to filter by
 * @param {number} filters.limit - Limit results
 * @param {number} filters.offset - Pagination offset
 * @returns {Promise<Object>} Search results with metadata
 */
async function searchAccessories(filters = {}) {
    const {
        query,
        categories = [],
        types = [],
        limit = 50,
        offset = 0
    } = filters;
    
    try {
        const where = {
            subcategoryCode: {
                startsWith: '720.'
            },
            assemblyId: { 
                notIn: ['T2-OA-2D-152012-STACKED-KIT', 'T2-OA-PO-SHLF-1212'] // Exclude drawer/compartment items moved to sink body config
            }
        };
        
        // Apply category filter
        if (categories.length > 0) {
            where.subcategoryCode = { in: categories };
        }
        
        // Apply type filter
        if (types.length > 0) {
            where.type = { in: types };
        } else {
            where.type = { in: ['KIT', 'SERVICE_PART', 'COMPLEX', 'SIMPLE'] };
        }
        
        // Apply search query
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { assemblyId: { contains: query, mode: 'insensitive' } }
            ];
        }
        
        const totalCount = await prisma.assembly.count({ where });
        
        const accessories = await prisma.assembly.findMany({
            where,
            select: {
                assemblyId: true,
                name: true,
                type: true,
                subcategoryCode: true
            },
            orderBy: [
                { name: 'asc' }
            ],
            take: limit,
            skip: offset
        });
        
        const categoryMap = await getCategoryMap();
        
        const formattedAccessories = accessories.map(accessory => ({
            id: accessory.assemblyId,
            assemblyId: accessory.assemblyId,
            name: accessory.name,
            type: accessory.type,
            categoryCode: accessory.subcategoryCode,
            categoryName: categoryMap[accessory.subcategoryCode] || 'Unknown Category',
            displayName: formatAccessoryDisplayName(accessory.name)
        }));
        
        return {
            accessories: formattedAccessories,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            },
            filters: {
                query,
                categories,
                types
            }
        };
    } catch (error) {
        console.error('Error searching accessories:', error);
        throw new Error('Failed to search accessories');
    }
}

/**
 * Get accessory details by ID
 * @param {string} assemblyId - Assembly ID
 * @returns {Promise<Object|null>} Detailed accessory information
 */
async function getAccessoryDetails(assemblyId) {
    try {
        const accessory = await prisma.assembly.findUnique({
            where: { assemblyId },
            select: {
                assemblyId: true,
                name: true,
                type: true,
                subcategoryCode: true,
                components: {
                    select: {
                        quantity: true,
                        notes: true,
                        childPart: {
                            select: {
                                partId: true,
                                name: true,
                                type: true
                            }
                        },
                        childAssembly: {
                            select: {
                                assemblyId: true,
                                name: true,
                                type: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!accessory) {
            return null;
        }
        
        const categoryMap = await getCategoryMap();
        
        return {
            id: accessory.assemblyId,
            assemblyId: accessory.assemblyId,
            name: accessory.name,
            type: accessory.type,
            categoryCode: accessory.subcategoryCode,
            categoryName: categoryMap[accessory.subcategoryCode] || 'Unknown Category',
            displayName: formatAccessoryDisplayName(accessory.name),
            components: accessory.components
        };
    } catch (error) {
        console.error('Error fetching accessory details:', error);
        throw new Error('Failed to fetch accessory details');
    }
}

/**
 * Helper function to get category name mapping
 * @returns {Promise<Object>} Map of category codes to names
 */
async function getCategoryMap() {
    try {
        const categories = await prisma.subcategory.findMany({
            where: {
                categoryId: '720'
            },
            select: {
                subcategoryId: true,
                name: true
            }
        });
        
        const categoryMap = {};
        categories.forEach(category => {
            categoryMap[category.subcategoryId] = category.name;
        });
        
        return categoryMap;
    } catch (error) {
        console.error('Error building category map:', error);
        return {};
    }
}

/**
 * Helper function to format accessory display names
 * @param {string} name - Raw assembly name
 * @returns {string} Formatted display name
 */
function formatAccessoryDisplayName(name) {
    // Remove common prefixes and format for better display
    let displayName = name
        .replace(/^T-OA-/, '')
        .replace(/^T2-OA-/, '')
        .replace(/-KIT$/, '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return displayName;
}

module.exports = {
    getAccessoryCategories,
    getAccessoriesByCategory,
    getAllAccessories,
    getAccessoriesGroupedByCategory,
    getFeaturedAccessories,
    searchAccessories,
    getAccessoryDetails
};