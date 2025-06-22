import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { inventoryBrowserService } from '@/lib/inventoryBrowserService'

/**
 * GET /api/procurement/inventory/export
 * 
 * Export inventory hierarchy in various formats.
 * Independent from BOM generation logic.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to export inventory' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const categoryId = searchParams.get('categoryId')
    const assemblyId = searchParams.get('assemblyId')

    let exportData: any = {}

    if (assemblyId) {
      // Export specific assembly with flattened components
      const assembly = await inventoryBrowserService.getAssemblyDetails(assemblyId)
      const flattenedComponents = await inventoryBrowserService.getFlattenedAssemblyComponents(assemblyId)
      
      exportData = {
        type: 'assembly_export',
        assembly,
        flattenedComponents,
        exportedAt: new Date().toISOString(),
        exportedBy: user.email
      }
    } else if (categoryId) {
      // Export specific category
      const categories = await inventoryBrowserService.getCategoryHierarchy()
      const category = categories.find(cat => cat.id === categoryId)
      const assemblies = await inventoryBrowserService.getCategoryAssemblies(categoryId)
      
      exportData = {
        type: 'category_export',
        category,
        assemblies,
        exportedAt: new Date().toISOString(),
        exportedBy: user.email
      }
    } else {
      // Export complete hierarchy
      const categories = await inventoryBrowserService.getCategoryHierarchy()
      const stats = await inventoryBrowserService.getInventoryStats()
      
      exportData = {
        type: 'full_hierarchy_export',
        categories,
        stats,
        exportedAt: new Date().toISOString(),
        exportedBy: user.email
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      return generateCSVResponse(exportData)
    } else {
      // Default to JSON
      const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.json`
      
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

  } catch (error) {
    console.error('Error exporting inventory:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to export inventory' },
      { status: 500 }
    )
  }
}

function generateCSVResponse(exportData: any): NextResponse {
  let csvContent = ''
  
  if (exportData.type === 'assembly_export') {
    // CSV format for assembly export
    csvContent = 'Component ID,Component Name,Type,Quantity,Parent Assembly\n'
    
    for (const component of exportData.flattenedComponents || []) {
      csvContent += `"${component.id}","${component.name}","${component.type}",${component.quantity},"${component.parentAssemblyId}"\n`
    }
  } else if (exportData.type === 'category_export') {
    // CSV format for category export
    csvContent = 'Assembly ID,Assembly Name,Type,Category,Subcategory,Component Count\n'
    
    for (const assembly of exportData.assemblies || []) {
      csvContent += `"${assembly.id}","${assembly.name}","${assembly.type}","${assembly.categoryCode || ''}","${assembly.subcategoryCode || ''}",${assembly.components.length}\n`
    }
  } else {
    // CSV format for full hierarchy
    csvContent = 'Type,ID,Name,Category,Subcategory,Component Count\n'
    
    for (const category of exportData.categories || []) {
      csvContent += `"Category","${category.id}","${category.name}","","",${category.subcategories.length}\n`
      
      for (const subcategory of category.subcategories) {
        csvContent += `"Subcategory","${subcategory.id}","${subcategory.name}","${category.id}","",${subcategory.assemblyRefs.length}\n`
      }
    }
  }

  const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}