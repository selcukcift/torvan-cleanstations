import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createStandardAPIResponse, createStandardErrorResponse } from '@/lib/apiResponse'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Check if user has permission to view inventory
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'ASSEMBLER'].includes(user.role)) {
      return createStandardErrorResponse('FORBIDDEN', 'Insufficient permissions to view part details', 403)
    }

    const resolvedParams = await params
    const part = await prisma.part.findUnique({
      where: { id: resolvedParams.partId },
      include: {
        bomItems: {
          include: {
            assembly: {
              select: {
                id: true,
                name: true,
                assemblyNumber: true
              }
            }
          }
        },
        _count: {
          select: {
            bomItems: true
          }
        }
      }
    })

    if (!part) {
      return createStandardErrorResponse('NOT_FOUND', 'Part not found', 404)
    }

    // Add computed fields
    const enrichedPart = {
      ...part,
      stockStatus: part.quantityInStock <= part.minimumStockLevel ? 'low' : 
                   part.quantityInStock === 0 ? 'out_of_stock' : 'in_stock',
      totalValue: part.quantityInStock * part.unitPrice,
      usedInAssemblies: part.bomItems.map(item => ({
        assemblyId: item.assembly.id,
        assemblyName: item.assembly.name,
        assemblyNumber: item.assembly.assemblyNumber,
        quantity: item.quantity,
        unitCost: item.unitCost
      }))
    }

    return createStandardAPIResponse({ part: enrichedPart })

  } catch (error) {
    console.error('Error fetching part:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to fetch part details')
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Check if user has permission to update parts
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return createStandardErrorResponse('FORBIDDEN', 'Insufficient permissions to update parts', 403)
    }

    const body = await request.json()

    const resolvedParams = await params
    // Check if part exists
    const existingPart = await prisma.part.findUnique({
      where: { id: resolvedParams.partId }
    })

    if (!existingPart) {
      return createStandardErrorResponse('NOT_FOUND', 'Part not found', 404)
    }

    // If part number is being changed, check for conflicts
    if (body.partNumber && body.partNumber !== existingPart.partNumber) {
      const conflictingPart = await prisma.part.findUnique({
        where: { partNumber: body.partNumber }
      })

      if (conflictingPart) {
        return createStandardErrorResponse(
          'VALIDATION_ERROR',
          `Part with number ${body.partNumber} already exists`
        )
      }
    }

    // Build update data object
    const updateData: any = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.partNumber !== undefined) updateData.partNumber = body.partNumber
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.unitPrice !== undefined) updateData.unitPrice = parseFloat(body.unitPrice)
    if (body.quantityInStock !== undefined) updateData.quantityInStock = parseInt(body.quantityInStock)
    if (body.minimumStockLevel !== undefined) updateData.minimumStockLevel = parseInt(body.minimumStockLevel)
    if (body.supplier !== undefined) updateData.supplier = body.supplier
    if (body.specifications !== undefined) updateData.specifications = body.specifications

    const updatedPart = await prisma.part.update({
      where: { id: resolvedParams.partId },
      data: updateData
    })

    return createStandardAPIResponse({
      part: updatedPart,
      message: 'Part updated successfully'
    })

  } catch (error) {
    console.error('Error updating part:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to update part')
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Only admins can delete parts
    if (user.role !== 'ADMIN') {
      return createStandardErrorResponse('FORBIDDEN', 'Only administrators can delete parts', 403)
    }

    const resolvedParams = await params
    // Check if part exists
    const existingPart = await prisma.part.findUnique({
      where: { id: resolvedParams.partId },
      include: {
        _count: {
          select: {
            bomItems: true
          }
        }
      }
    })

    if (!existingPart) {
      return createStandardErrorResponse('NOT_FOUND', 'Part not found', 404)
    }

    // Check if part is used in any assemblies
    if (existingPart._count.bomItems > 0) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        `Cannot delete part ${existingPart.partNumber} as it is used in ${existingPart._count.bomItems} assembly(ies)`
      )
    }

    await prisma.part.delete({
      where: { id: resolvedParams.partId }
    })

    return createStandardAPIResponse({
      message: `Part ${existingPart.partNumber} deleted successfully`
    })

  } catch (error) {
    console.error('Error deleting part:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to delete part')
  } finally {
    await prisma.$disconnect()
  }
}