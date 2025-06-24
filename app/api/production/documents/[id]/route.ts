import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const document = await prisma.productionDocument.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true,
            wantDate: true,
            buildNumbers: true
          }
        },
        approver: {
          select: {
            fullName: true,
            initials: true,
            role: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Production document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: document
    })

  } catch (error) {
    console.error('Error fetching production document:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { approved } = body

    // Get existing document
    const existingDocument = await prisma.productionDocument.findUnique({
      where: { id: params.id }
    })

    if (!existingDocument) {
      return NextResponse.json(
        { success: false, message: 'Production document not found' },
        { status: 404 }
      )
    }

    // Check permissions for approval
    if (approved !== undefined) {
      if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions to approve documents' },
          { status: 403 }
        )
      }

      // Cannot unapprove documents
      if (existingDocument.approved && !approved) {
        return NextResponse.json(
          { success: false, message: 'Cannot unapprove an already approved document' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (approved !== undefined) {
      updateData.approved = approved
      if (approved) {
        updateData.approvedBy = user.id
        updateData.approvedAt = new Date()
      }
    }

    // Update document
    const updatedDocument = await prisma.productionDocument.update({
      where: { id: params.id },
      data: updateData,
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        },
        approver: {
          select: {
            fullName: true,
            initials: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedDocument,
      message: approved ? 'Document approved successfully' : 'Document updated successfully'
    })

  } catch (error) {
    console.error('Error updating production document:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins and production coordinators can delete documents
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to delete production documents' },
        { status: 403 }
      )
    }

    const document = await prisma.productionDocument.findUnique({
      where: { id: params.id }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Production document not found' },
        { status: 404 }
      )
    }

    // Cannot delete approved documents
    if (document.approved) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete approved production documents' },
        { status: 400 }
      )
    }

    await prisma.productionDocument.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Production document deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting production document:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}