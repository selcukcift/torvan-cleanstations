import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

/**
 * Accessories catalog based on resources/sink configuration and bom.txt
 * Part numbers 702.x - 705.x with proper categorization
 */

interface AccessoryItem {
  id: string
  assemblyId: string
  name: string
  description: string
  category: string
  categoryName: string
  subcategory?: string
  partNumber: string
  available: boolean
}

// Static accessories data from resources/sink configuration and bom.txt
const ACCESSORIES_CATALOG: AccessoryItem[] = [
  // 702.x - Storage & Organization
  {
    id: '702.4',
    assemblyId: 'T-OA-BINRAIL-24-KIT',
    name: 'Bin Rail 24" Kit',
    description: 'BIN RAIL, 24" KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'bin-rails',
    partNumber: '702.4',
    available: true
  },
  {
    id: '702.5',
    assemblyId: 'T-OA-BINRAIL-36-KIT',
    name: 'Bin Rail 36" Kit',
    description: 'BIN RAIL, 36" KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'bin-rails',
    partNumber: '702.5',
    available: true
  },
  {
    id: '702.6',
    assemblyId: 'T-OA-BINRAIL-48-KIT',
    name: 'Bin Rail 48" Kit',
    description: 'BIN RAIL, 48" KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'bin-rails',
    partNumber: '702.6',
    available: true
  },
  {
    id: '702.7',
    assemblyId: 'T-OA-PFW1236FM-KIT',
    name: 'Wire Basket 36"x12" Kit',
    description: 'WIRE BASKET KIT, SLOT BRACKET HELD, CHROME, 36"W X 12"D WITH BRACKETS',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'baskets',
    partNumber: '702.7',
    available: true
  },
  {
    id: '702.8',
    assemblyId: 'T-OA-PFW1218FM-KIT',
    name: 'Wire Basket 18"x12" Kit',
    description: 'WIRE BASKET KIT, SLOT BRACKET HELD, CHROME, 18"W X 12"D WITH BRACKETS',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'baskets',
    partNumber: '702.8',
    available: true
  },
  {
    id: '702.9',
    assemblyId: 'T-OA-PFW1818FM-KIT',
    name: 'Wire Basket 18"x18" Kit',
    description: 'WIRE BASKET KIT, SLOT BRACKET HELD, CHROME, 18"W X 18"D WITH BRACKETS',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'baskets',
    partNumber: '702.9',
    available: true
  },
  {
    id: '702.10',
    assemblyId: 'T-OA-SSSHELF-1812',
    name: 'SS Slot Shelf 18"x12"',
    description: 'STAINLESS STEEL SLOT SHELF, 18"W X 12"D',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.10',
    available: true
  },
  {
    id: '702.11',
    assemblyId: 'T-OA-SSSHELF-1812-BOLT-ON-KIT',
    name: 'SS Shelf 18"x12" Bolt-On Kit',
    description: 'STAINLESS STEEL SHELF, 18"W X 12"D BOLT ON (FOR SOLID PEGBOARD) KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.11',
    available: true
  },
  {
    id: '702.12',
    assemblyId: 'T-OA-SSSHELF-3612',
    name: 'SS Slot Shelf 36"x12"',
    description: 'STAINLESS STEEL SLOT SHELF, 36"W X 12"D',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.12',
    available: true
  },
  {
    id: '702.13',
    assemblyId: 'T-OA-SSSHELF-3612-BOLT-ON-KIT',
    name: 'SS Shelf 36"x12" Bolt-On Kit',
    description: 'STAINLESS STEEL SLOT SHELF, 36"W X 12"D BOLT ON (FOR SOLID PEGBOARD) KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.13',
    available: true
  },
  {
    id: '702.14',
    assemblyId: 'T2-OHL-INSTRO-KIT',
    name: 'Overhead Light Shelf Kit',
    description: 'OVERHEAD LIGHT SHELF WITH LED LIGHT (ONLY FOR INSTROSINK)',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'specialized',
    partNumber: '702.14',
    available: true
  },
  {
    id: '702.15',
    assemblyId: 'T-OA-B110505',
    name: 'Blue Bin 10.875"x5.5"x5"',
    description: 'BLUE, 10-7/8" X 5-1/2" X 5" HANGING AND STACKING BIN',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'bins',
    partNumber: '702.15',
    available: true
  },
  {
    id: '702.16',
    assemblyId: 'T-OA-B110807',
    name: 'Blue Bin 10.875"x8.125"x7"',
    description: 'BLUE, 10-7/8" X 8-1/8" X 7" HANGING AND STACKING BIN',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'bins',
    partNumber: '702.16',
    available: true
  },
  {
    id: '702.17',
    assemblyId: 'T-OA-B111105',
    name: 'Blue Bin 10.875"x11"x5"',
    description: 'BLUE, 10-7/8" X 11" X 5" HANGING AND STACKING BIN',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'bins',
    partNumber: '702.17',
    available: true
  },
  {
    id: '702.18',
    assemblyId: 'B210-BLUE',
    name: 'Blue Plastic Bin Small',
    description: 'BLUE PLASTIC BIN, 5.75"X4.125"X3"',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'bins',
    partNumber: '702.18',
    available: true
  },
  {
    id: '702.19',
    assemblyId: 'T2-OA-LT-SSSHELF-LRG',
    name: 'Leak Tester Shelf Large',
    description: 'STAINLESS STEEL LEAK TESTER PEGBOARD SHELF, 10"X20", FOR LARGE SCOPE',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'specialized',
    partNumber: '702.19',
    available: true
  },
  {
    id: '702.20',
    assemblyId: 'T2-OA-LT-SSSHELF-SML',
    name: 'Leak Tester Shelf Small',
    description: 'STAINLESS STEEL LEAK TESTER PEGBOARD SHELF, 6"X10", FOR SMALL SCOPE',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'specialized',
    partNumber: '702.20',
    available: true
  },
  {
    id: '702.21',
    assemblyId: 'T-OA-SSSHELF-LGHT-1812-KIT',
    name: 'SS Shelf with Underlight 18"x12"',
    description: 'STAINLESS STEEL SLOT SHELF WITH UNDERLIGHT, 18"W X 12"D KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.21',
    available: true
  },
  {
    id: '702.22',
    assemblyId: 'T-OA-SSSHELF-LGHT-3612-KIT',
    name: 'SS Shelf with Underlight 36"x12"',
    description: 'STAINLESS STEEL SLOT SHELF WITH UNDERLIGHT, 36"W X 12"D KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.22',
    available: true
  },
  {
    id: '702.23',
    assemblyId: 'T2-OA-CUST-SHELF-HA-SML',
    name: 'Height Adjustable Shelf Small',
    description: 'HEIGHT ADJUSTABLE BOTTOM SHELF ADDER (LENGTHS LESS THEN 84")',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.23',
    available: true
  },
  {
    id: '702.24',
    assemblyId: 'T2-OA-CUST-SHELF-HA-LRG',
    name: 'Height Adjustable Shelf Large',
    description: 'HEIGHT ADJUSTABLE BOTTOM SHELF ADDER (LENGTHS GREATER THEN 84")',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.24',
    available: true
  },
  {
    id: '702.25',
    assemblyId: 'T-OA-RAIL-SHELF-ADDER-SML',
    name: 'Rail Shelf Adder Small',
    description: 'RAIL SHELF ADDER (LENGTHS LESS THEN 84")',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.25',
    available: true
  },
  {
    id: '702.26',
    assemblyId: 'T-OA-RAIL-SHELF-ADDER-LRG',
    name: 'Rail Shelf Adder Large',
    description: 'RAIL SHELF ADDER (LENGTHS GREATER THEN 84")',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'shelves',
    partNumber: '702.26',
    available: true
  },
  {
    id: '702.27',
    assemblyId: 'T-OA-FOOTREST-RAIL-KIT',
    name: 'Foot Rail Rest Kit',
    description: 'FOOT RAIL REST KIT',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'ergonomic',
    partNumber: '702.27',
    available: true
  },
  {
    id: '702.28',
    assemblyId: 'T2-OA-DOSINGESK-BTMSHELF',
    name: 'Dosing Pump Bottom Shelf',
    description: 'BOTTOM SHELF FOR DOSING PUMP',
    category: 'storage',
    categoryName: 'Storage & Organization',
    subcategory: 'specialized',
    partNumber: '702.28',
    available: true
  },

  // 703.x - Organization & Workflow
  {
    id: '703.29',
    assemblyId: 'T-OA-1BRUSH-ORG-PB-KIT',
    name: 'Single Brush Holder',
    description: 'SINGLE BRUSH HOLDER, STAY-PUT PEGBOARD MOUNT',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'brush-holders',
    partNumber: '703.29',
    available: true
  },
  {
    id: '703.30',
    assemblyId: 'T-OA-6BRUSH-ORG-PB-KIT',
    name: '6 Brush Organizer',
    description: '6 BRUSH ORGANIZER, STAY-PUT PEGBOARD MOUNT',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'brush-holders',
    partNumber: '703.30',
    available: true
  },
  {
    id: '703.31',
    assemblyId: 'T-OA-WRK-FLW-PB',
    name: 'Workflow Indicator Set',
    description: 'PEGBOARD MOUNT WORKFLOW INDICATOR (SET OF 3)',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'workflow',
    partNumber: '703.31',
    available: true
  },
  {
    id: '703.32',
    assemblyId: 'T-OA-PPRACK-2066',
    name: 'Peel Pouch Rack',
    description: 'STAINLESS STEEL PEEL POUCH RACK, 20.5 X 6 X 6',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'racks',
    partNumber: '703.32',
    available: true
  },
  {
    id: '703.33',
    assemblyId: 'T-OA-PB-SS-1L-SHLF',
    name: '1L Double Bottle Holder',
    description: 'ONE LITRE DOUBLE BOTTLE HOLDER, STAINLESS STEEL',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'bottle-holders',
    partNumber: '703.33',
    available: true
  },
  {
    id: '703.34',
    assemblyId: 'T-OA-PB-SS-2G-SHLF',
    name: '1 Gallon Detergent Holder',
    description: 'ONE GALLON DOUBLE DETERGENT HOLDER, STAINLESS STEEL',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'bottle-holders',
    partNumber: '703.34',
    available: true
  },
  {
    id: '703.35',
    assemblyId: 'T-OA-PB-SS-1GLOVE',
    name: 'Single Glove Dispenser',
    description: 'SINGLE GLOVE DISPENSER, STAINLESS STEEL, 6"W X 11"H',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'dispensers',
    partNumber: '703.35',
    available: true
  },
  {
    id: '703.36',
    assemblyId: 'T-OA-PB-SS-2GLOVE',
    name: 'Double Glove Dispenser',
    description: 'DOUBLE GLOVE DISPENSER, STAINLESS STEEL, 10"W X 11"H',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'dispensers',
    partNumber: '703.36',
    available: true
  },
  {
    id: '703.37',
    assemblyId: 'T-OA-PB-SS-3GLOVE',
    name: 'Triple Glove Dispenser',
    description: 'TRIPLE GLOVE DISPENSER, STAINLESS STEEL, 10"W X 17"H',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'dispensers',
    partNumber: '703.37',
    available: true
  },
  {
    id: '703.38',
    assemblyId: 'T2-OA-SC-2020-SS',
    name: 'Sink Cover 20x20',
    description: 'SINK STAGING COVER FOR 20X20 BASIN, STAINLESS STEEL',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'covers',
    partNumber: '703.38',
    available: true
  },
  {
    id: '703.39',
    assemblyId: 'T2-OA-SC-2420-SS',
    name: 'Sink Cover 24x20',
    description: 'SINK STAGING COVER FOR 24X20 BASIN, STAINLESS STEEL',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'covers',
    partNumber: '703.39',
    available: true
  },
  {
    id: '703.40',
    assemblyId: 'T2-OA-SC-3020-SS',
    name: 'Sink Cover 30x20',
    description: 'SINK STAGING COVER FOR 30X20 BASIN, STAINLESS STEEL',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'covers',
    partNumber: '703.40',
    available: true
  },
  {
    id: '703.41',
    assemblyId: 'T2-AER-TUBEORG',
    name: 'AER Tubing Organizer',
    description: 'AER TUBING ORGANIZER',
    category: 'organization',
    categoryName: 'Organization & Workflow',
    subcategory: 'specialized',
    partNumber: '703.41',
    available: true
  },

  // 704.x - Lighting & Magnification
  {
    id: '704.42',
    assemblyId: 'T-OA-MLIGHT-PB-KIT',
    name: 'Magnifying Light 5"',
    description: 'MAGNIFYING LIGHT, 5" LENS, PEGBOARD MOUNT KIT',
    category: 'lighting',
    categoryName: 'Lighting & Magnification',
    subcategory: 'magnifying-lights',
    partNumber: '704.42',
    available: true
  },
  {
    id: '704.43',
    assemblyId: 'T-OA-DIM-MLIGHT-PB-KIT',
    name: 'Dimmable Magnifying Light 5"',
    description: 'DIMMABLE MAGNIFYING LIGHT, 5" LENS, PEGBOARD MOUNT KIT',
    category: 'lighting',
    categoryName: 'Lighting & Magnification',
    subcategory: 'magnifying-lights',
    partNumber: '704.43',
    available: true
  },
  {
    id: '704.44',
    assemblyId: 'T-OA-TASKLIGHT-PB',
    name: 'LED Task Light 27"',
    description: 'GOOSENECK 27" LED TASK LIGHT, 10DEG FOCUSING BEAM, IP65 HEAD, 24VDC, PB MOUNT',
    category: 'lighting',
    categoryName: 'Lighting & Magnification',
    subcategory: 'task-lights',
    partNumber: '704.44',
    available: true
  },
  {
    id: '704.45',
    assemblyId: 'T-OA-TASKLIGHT-PB-MAG-KIT',
    name: 'LED Task Light with Magnifier',
    description: 'GOOSENECK LED TASK LIGHT WITH MAGNIFIER, FOCUSING BEAM, PB MOUNT KIT',
    category: 'lighting',
    categoryName: 'Lighting & Magnification',
    subcategory: 'task-lights',
    partNumber: '704.45',
    available: true
  },

  // 705.x - Technology & Mounting
  {
    id: '705.46',
    assemblyId: 'T-OA-MNT-ARM',
    name: 'Single Monitor Mount',
    description: 'WALL MONITOR PIVOT, SINGLE MONITOR MOUNT',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'monitor-mounts',
    partNumber: '705.46',
    available: true
  },
  {
    id: '705.47',
    assemblyId: 'T-OA-MNT-ARM-1EXT',
    name: 'Monitor Arm 1 Extension',
    description: 'WALL MONITOR ARM, 1 EXTENSION, SINGLE MONITOR MOUNT',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'monitor-mounts',
    partNumber: '705.47',
    available: true
  },
  {
    id: '705.48',
    assemblyId: 'T-OA-MNT-ARM-2EXT',
    name: 'Monitor Arm 2 Extensions',
    description: 'WALL MONITOR ARM, 2 EXTENSION, SINGLE MONITOR MOUNT',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'monitor-mounts',
    partNumber: '705.48',
    available: true
  },
  {
    id: '705.49',
    assemblyId: 'T-OA-KB-MOUSE-ARM',
    name: 'Keyboard Mouse Arm',
    description: 'WALL KEYBOARD ARM, KEYBOARD MOUNT WITH SLIDE-OUT MOUSE TRAY',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'input-devices',
    partNumber: '705.49',
    available: true
  },
  {
    id: '705.50',
    assemblyId: 'T-OA-2H-CPUSM',
    name: 'CPU Holder Small',
    description: 'CPU HOLDER, VERTICAL, SMALL (80-063-200)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'cpu-holders',
    partNumber: '705.50',
    available: true
  },
  {
    id: '705.51',
    assemblyId: 'T-OA-2H-CPULG',
    name: 'CPU Holder Large',
    description: 'CPU HOLDER, VERTICAL, LARGE (97-468-202)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'cpu-holders',
    partNumber: '705.51',
    available: true
  },
  {
    id: '705.52',
    assemblyId: 'T-OA-2H-CPUUV',
    name: 'CPU Holder Universal',
    description: 'CPU HOLDER, TETHERED, UNIVERSAL (80-105-064)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'cpu-holders',
    partNumber: '705.52',
    available: true
  },
  {
    id: '705.53',
    assemblyId: 'T-OA-MMA-PB',
    name: 'Monitor Mount Arm Single PB',
    description: 'MONITOR MOUNT ARM, SINGLE, PB MOUNT (45-353-026)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'monitor-mounts',
    partNumber: '705.53',
    available: true
  },
  {
    id: '705.54',
    assemblyId: 'T-OA-MMA-DUAL',
    name: 'Dual Monitor Adapter',
    description: 'MONITOR MOUNT ADAPTER, DUAL MONITOR (97-783)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'monitor-mounts',
    partNumber: '705.54',
    available: true
  },
  {
    id: '705.55',
    assemblyId: 'T-OA-MMA-LTAB',
    name: 'Locking Tablet Adapter',
    description: 'MONITOR MOUNT ADAPTER, TABLET, LOCKING (45-460-026)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'tablet-mounts',
    partNumber: '705.55',
    available: true
  },
  {
    id: '705.56',
    assemblyId: 'T-OA-MMA-LAP',
    name: 'Laptop Tray Adapter',
    description: 'MONITOR MOUNT ADAPTER, LAPTOP TRAY (50-193-200)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'laptop-mounts',
    partNumber: '705.56',
    available: true
  },
  {
    id: '705.57',
    assemblyId: 'T-OA-MNT-SINGLE-COMBO-PB',
    name: 'Combo Keyboard & Monitor Mount',
    description: 'COMBO ARM, KEYBOARD & MONITOR MOUNT FOR PEGBOARD (BLACK)',
    category: 'technology',
    categoryName: 'Technology & Mounting',
    subcategory: 'combo-mounts',
    partNumber: '705.57',
    available: true
  }
]

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const search = searchParams.get('search')

    let filteredAccessories = ACCESSORIES_CATALOG

    // Filter by category
    if (category && category !== 'all') {
      filteredAccessories = filteredAccessories.filter(item => item.category === category)
    }

    // Filter by subcategory
    if (subcategory && subcategory !== 'all') {
      filteredAccessories = filteredAccessories.filter(item => item.subcategory === subcategory)
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase()
      filteredAccessories = filteredAccessories.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.assemblyId.toLowerCase().includes(searchLower)
      )
    }

    // Group by category for organized display
    const categorizedAccessories = filteredAccessories.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          categoryName: item.categoryName,
          items: []
        }
      }
      acc[item.category].items.push(item)
      return acc
    }, {} as Record<string, { categoryName: string; items: AccessoryItem[] }>)

    // Get category counts
    const categoryCounts = ACCESSORIES_CATALOG.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get subcategory counts for current category
    const subcategoryCounts = ACCESSORIES_CATALOG
      .filter(item => !category || category === 'all' || item.category === category)
      .reduce((acc, item) => {
        if (item.subcategory) {
          acc[item.subcategory] = (acc[item.subcategory] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        accessories: filteredAccessories,
        categorized: categorizedAccessories,
        categories: [
          { id: 'all', name: 'All Categories', count: ACCESSORIES_CATALOG.length },
          { id: 'storage', name: 'Storage & Organization', count: categoryCounts.storage || 0 },
          { id: 'organization', name: 'Organization & Workflow', count: categoryCounts.organization || 0 },
          { id: 'lighting', name: 'Lighting & Magnification', count: categoryCounts.lighting || 0 },
          { id: 'technology', name: 'Technology & Mounting', count: categoryCounts.technology || 0 }
        ],
        subcategories: Object.entries(subcategoryCounts).map(([id, count]) => ({
          id,
          name: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          count
        })),
        totalCount: filteredAccessories.length
      }
    })

  } catch (error) {
    console.error('Error fetching accessories catalog:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accessories catalog' },
      { status: 500 }
    )
  }
}