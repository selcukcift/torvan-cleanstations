import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

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

    // Check permissions - only QC, admins, and production coordinators can approve documents
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to approve production documents' },
        { status: 403 }
      )
    }

    // Get existing document
    const existingDocument = await prisma.productionDocument.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        }
      }
    })

    if (!existingDocument) {
      return NextResponse.json(
        { success: false, message: 'Production document not found' },
        { status: 404 }
      )
    }

    // Check if already approved
    if (existingDocument.approved) {
      return NextResponse.json(
        { success: false, message: 'Document is already approved' },
        { status: 400 }
      )
    }

    // Approve the document
    const approvedDocument = await prisma.productionDocument.update({
      where: { id: params.id },
      data: {
        approved: true,
        approvedBy: user.id,
        approvedAt: new Date()
      },
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

    // Create audit log for approval
    await prisma.orderHistoryLog.create({
      data: {
        orderId: existingDocument.orderId,
        userId: user.id,
        action: 'DOCUMENT_APPROVED',
        notes: `${existingDocument.type} document approved: ${existingDocument.title}`
      }
    })

    // Check if this is a completion certificate and update workflow
    if (existingDocument.type === 'COMPLETION_CERTIFICATE') {
      try {
        const { updateOrderWorkflowState } = await import('@/lib/orderSingleSourceOfTruth')
        await updateOrderWorkflowState(existingDocument.orderId, 'PRODUCTION_CERTIFIED', {
          productionDocuments: {
            completionCertificate: {
              documentId: params.id,
              approvedAt: new Date().toISOString(),
              approvedBy: user.fullName
            }
          }
        })
      } catch (error) {
        console.warn('Could not update order workflow state:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: approvedDocument,
      message: 'Production document approved successfully'
    })

  } catch (error) {
    console.error('Error approving production document:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}