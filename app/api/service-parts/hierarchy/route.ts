import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, checkUserRole } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!checkUserRole(user, ['SERVICE_DEPARTMENT', 'PROCUREMENT_SPECIALIST', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to browse service parts hierarchy' },
        { status: 403 }
      )
    }

    // Get SERVICE PARTS category (719) with complete hierarchy
    const servicePartsCategory = await prisma.category.findUnique({
      where: {
        categoryId: '719'
      },
      select: {
        categoryId: true,
        name: true,
        description: true,
        subcategories: {
          select: {
            subcategoryId: true,
            name: true,
            description: true,
            // Get assemblies for each subcategory
            assemblies: {
              where: {
                categoryCode: '719'
              },
              select: {
                assemblyId: true,
                name: true,
                type: true,
                categoryCode: true,
                subcategoryCode: true,
                isOrderable: true,
                kitComponentsJson: true,
                // Include components
                components: {
                  select: {
                    id: true,
                    quantity: true,
                    notes: true,
                    childPart: {
                      select: {
                        partId: true,
                        name: true,
                        manufacturerPartNumber: true,
                        type: true,
                        status: true,
                        photoURL: true,
                        technicalDrawingURL: true
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
              },
              orderBy: {
                name: 'asc'
              }
            }
          },
          orderBy: {
            subcategoryId: 'asc'
          }
        }
      }
    })

    if (!servicePartsCategory) {
      return NextResponse.json({
        success: false,
        message: 'Service Parts category (719) not found'
      }, { status: 404 })
    }

    // Transform the data to include counts and structure
    const hierarchicalData = {
      category: {
        categoryId: servicePartsCategory.categoryId,
        name: servicePartsCategory.name,
        description: servicePartsCategory.description,
        totalSubcategories: servicePartsCategory.subcategories.length
      },
      subcategories: servicePartsCategory.subcategories.map(subcategory => {
        const assemblyCount = subcategory.assemblies.length
        const componentCount = subcategory.assemblies.reduce(
          (total, assembly) => total + assembly.components.length, 
          0
        )
        
        return {
          subcategoryId: subcategory.subcategoryId,
          name: subcategory.name,
          description: subcategory.description,
          assemblyCount,
          componentCount,
          assemblies: subcategory.assemblies.map(assembly => ({
            assemblyId: assembly.assemblyId,
            name: assembly.name,
            type: assembly.type,
            canOrder: assembly.isOrderable,
            isKit: assembly.kitComponentsJson ? true : false,
            componentCount: assembly.components.length,
            components: assembly.components.map(comp => ({
              id: comp.id,
              quantity: comp.quantity,
              notes: comp.notes,
              part: comp.childPart,
              assembly: comp.childAssembly
            }))
          }))
        }
      })
    }

    // Calculate totals
    const totalAssemblies = hierarchicalData.subcategories.reduce(
      (total, sub) => total + sub.assemblyCount, 
      0
    )
    const totalComponents = hierarchicalData.subcategories.reduce(
      (total, sub) => total + sub.componentCount, 
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        ...hierarchicalData,
        summary: {
          totalSubcategories: hierarchicalData.category.totalSubcategories,
          totalAssemblies,
          totalComponents,
          generatedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Error fetching service parts hierarchy:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}