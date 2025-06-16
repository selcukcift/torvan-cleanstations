/**
 * Service Order Approval API Endpoint
 * Handles service order approval workflow with comprehensive validation
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createBusinessRuleViolationResponse,
  createAPIResponse,
  getRequestId,
  handleAPIError,
  API_ERROR_CODES
} from '@/lib/apiResponse'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const approvalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_MODIFICATION']),
  notes: z.string().optional(),
  procurementNotes: z.string().optional(),
  itemAdjustments: z.array(z.object({
    serviceOrderItemId: z.string().cuid(),
    approvedQuantity: z.number().int().min(0),
    notes: z.string().optional()
  })).optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional()
})

const bulkApprovalSchema = z.object({
  serviceOrderIds: z.array(z.string().cuid()).min(1).max(20),
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().optional(),
  procurementNotes: z.string().optional()
})

/**
 * POST /api/v1/service/orders/[serviceOrderId]/approve
 * Approve, reject, or request modification for a service order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceOrderId: string }> }
) {
  const requestId = getRequestId(request)
  
  try {
    const resolvedParams = await params
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Check permissions - Only procurement specialists and admins can approve
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Only procurement specialists can approve service orders'
        }, requestId),
        403
      )
    }

    const { serviceOrderId } = params
    const body = await request.json()
    
    const validation = approvalSchema.safeParse(body)
    if (!validation.success) {
      const validationErrors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return createAPIResponse(
        createValidationErrorResponse(validationErrors, requestId),
        400
      )
    }

    const {
      action,
      notes,
      procurementNotes,
      itemAdjustments,
      estimatedDeliveryDate,
      priority
    } = validation.data

    // Get current service order with full details
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        },
        items: {
          include: {
            part: {
              select: {
                partId: true,
                name: true,
                status: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!serviceOrder) {
      return createAPIResponse(
        createNotFoundResponse('Service Order', serviceOrderId, requestId),
        404
      )
    }

    // Business rule validations
    if (serviceOrder.status !== 'PENDING_APPROVAL') {
      return createAPIResponse(
        createBusinessRuleViolationResponse(
          'INVALID_STATUS_FOR_APPROVAL',
          `Service order is in ${serviceOrder.status} status and cannot be processed`,
          requestId
        ),
        422
      )
    }

    // Validate item adjustments if provided
    if (itemAdjustments && action === 'APPROVE') {
      const itemIds = serviceOrder.items.map(item => item.id)
      const adjustmentIds = itemAdjustments.map(adj => adj.serviceOrderItemId)
      
      const invalidIds = adjustmentIds.filter(id => !itemIds.includes(id))
      if (invalidIds.length > 0) {
        return createAPIResponse(
          createErrorResponse({
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid service order item IDs in adjustments',
            details: { invalidIds }
          }, requestId),
          400
        )
      }
    }

    // Check part availability for approvals
    if (action === 'APPROVE') {
      const unavailableParts = serviceOrder.items.filter(item => 
        item.part.status !== 'ACTIVE'
      )

      if (unavailableParts.length > 0) {
        return createAPIResponse(
          createBusinessRuleViolationResponse(
            'INACTIVE_PARTS_IN_ORDER',
            'Order contains inactive parts that cannot be approved',
            requestId
          ),
          422
        )
      }
    }

    // Process approval in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Determine new status
      let newStatus: any
      switch (action) {
        case 'APPROVE':
          newStatus = 'APPROVED'
          break
        case 'REJECT':
          newStatus = 'REJECTED'
          break
        case 'REQUEST_MODIFICATION':
          newStatus = 'PENDING_APPROVAL' // Stays pending but with modification request
          break
      }

      // Update service order
      const updatedOrder = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          status: newStatus,
          procurementNotes: updatedProcurementNotes,
          updatedAt: new Date(),
          ...(action === 'APPROVE' && estimatedDeliveryDate && {
            estimatedDeliveryDate: new Date(estimatedDeliveryDate)
          })
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          items: {
            include: {
              part: {
                select: {
                  partId: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        }
      })

      // Update item quantities if approved with adjustments
      if (action === 'APPROVE' && itemAdjustments) {
        for (const adjustment of itemAdjustments) {
          await tx.serviceOrderItem.update({
            where: { id: adjustment.serviceOrderItemId },
            data: {
              quantityApproved: adjustment.approvedQuantity,
              notes: adjustment.notes
            }
          })
        }
      } else if (action === 'APPROVE') {
        // Auto-approve all items with requested quantities
        const items = await tx.serviceOrderItem.findMany({
          where: { serviceOrderId }
        })
        
        for (const item of items) {
          await tx.serviceOrderItem.update({
            where: { id: item.id },
            data: { quantityApproved: item.quantityRequested }
          })
        }
      }

      // Store approval note in procurementNotes field
      const existingNotes = serviceOrder.procurementNotes || ''
      const approvalNote = `${new Date().toISOString()}: ${action} by ${user.fullName}: ${notes || 'No additional notes'}`
      const updatedProcurementNotes = existingNotes 
        ? `${existingNotes}\n\n${approvalNote}`
        : approvalNote

      // Create notifications
      await createApprovalNotifications(
        tx,
        updatedOrder,
        action,
        user,
        estimatedDeliveryDate,
        priority
      )

      // If approved, create inventory reservations
      if (action === 'APPROVE') {
        await createInventoryReservations(tx, updatedOrder)
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: `SERVICE_ORDER_${action}`,
          entityType: 'ServiceOrder',
          entityId: serviceOrderId,
          oldValues: { status: serviceOrder.status },
          newValues: { 
            status: newStatus,
            action,
            approvedBy: user.fullName,
            approvalDate: new Date()
          }
        }
      })

      return updatedOrder
    })

    return createAPIResponse(
      createSuccessResponse({
        ...result,
        approvalDetails: {
          action,
          approvedBy: user.fullName,
          approvalDate: new Date().toISOString(),
          notes,
          procurementNotes,
          estimatedDeliveryDate,
          priority,
          itemAdjustments: itemAdjustments ? {
            totalAdjustments: itemAdjustments.length,
            adjustments: itemAdjustments
          } : null
        }
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error processing service order approval:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * POST /api/v1/service/orders/approve/batch
 * Batch approve or reject multiple service orders
 */
export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    if (!['ADMIN', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions for batch approval'
        }, requestId),
        403
      )
    }

    const body = await request.json()
    const validation = bulkApprovalSchema.safeParse(body)
    
    if (!validation.success) {
      const validationErrors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return createAPIResponse(
        createValidationErrorResponse(validationErrors, requestId),
        400
      )
    }

    const { serviceOrderIds, action, notes, procurementNotes } = validation.data

    // Validate all service orders exist and are in correct status
    const serviceOrders = await prisma.serviceOrder.findMany({
      where: { id: { in: serviceOrderIds } },
      include: {
        requestedBy: {
          select: {
            id: true,
            fullName: true
          }
        },
        items: {
          include: {
            part: {
              select: {
                partId: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    })

    if (serviceOrders.length !== serviceOrderIds.length) {
      const foundIds = serviceOrders.map(order => order.id)
      const missingIds = serviceOrderIds.filter(id => !foundIds.includes(id))
      
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Some service orders not found',
          details: { missingServiceOrderIds: missingIds }
        }, requestId),
        404
      )
    }

    // Check all orders are in correct status
    const invalidStatusOrders = serviceOrders.filter(
      order => order.status !== 'PENDING_APPROVAL'
    )

    if (invalidStatusOrders.length > 0) {
      return createAPIResponse(
        createBusinessRuleViolationResponse(
          'INVALID_STATUS_FOR_BATCH_APPROVAL',
          'Some orders are not in pending approval status',
          requestId
        ),
        422
      )
    }

    // Process batch approval
    const results = await prisma.$transaction(async (tx) => {
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      const processedOrders = []
      const errors = []

      for (const order of serviceOrders) {
        try {
          // Check for inactive parts if approving
          if (action === 'APPROVE') {
            const inactiveParts = order.items.filter(
              item => item.part.status !== 'ACTIVE'
            )

            if (inactiveParts.length > 0) {
              errors.push({
                serviceOrderId: order.id,
                error: 'Contains inactive parts',
                inactiveParts: inactiveParts.map(item => item.part.partId)
              })
              continue
            }
          }

          // Update the order
          const updatedOrder = await tx.serviceOrder.update({
            where: { id: order.id },
            data: {
              status: newStatus,
              procurementNotes: procurementNotes || order.procurementNotes,
              updatedAt: new Date()
            }
          })

          // Auto-approve all items if approved
          if (action === 'APPROVE') {
            const items = await tx.serviceOrderItem.findMany({
              where: { serviceOrderId: order.id }
            })
            
            for (const item of items) {
              await tx.serviceOrderItem.update({
                where: { id: item.id },
                data: { quantityApproved: item.quantityRequested }
              })
            }
          }

          // Create notification
          await tx.systemNotification.create({
            data: {
              userId: order.requestedBy.id,
              type: 'SERVICE_REQUEST',
              title: `Service Order ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
              message: `Your service order has been ${action.toLowerCase()}${notes ? ': ' + notes : ''}`,
              data: {
                serviceOrderId: order.id,
                action,
                approvedBy: user.fullName
              },
              priority: action === 'REJECT' ? 'HIGH' : 'NORMAL'
            }
          })

          processedOrders.push(updatedOrder)

        } catch (error) {
          errors.push({
            serviceOrderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return { processedOrders, errors }
    })

    return createAPIResponse(
      createSuccessResponse({
        action,
        processedCount: results.processedOrders.length,
        errorCount: results.errors.length,
        processedOrders: results.processedOrders,
        errors: results.errors,
        batchDetails: {
          approvedBy: user.fullName,
          approvalDate: new Date().toISOString(),
          notes,
          procurementNotes
        }
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error processing batch approval:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

// Helper functions

async function createApprovalNotifications(
  tx: any,
  serviceOrder: any,
  action: string,
  approver: any,
  estimatedDeliveryDate?: string,
  priority?: string
) {
  const notifications = []

  // Notify requester
  notifications.push({
    userId: serviceOrder.requestedBy.id,
    type: 'SERVICE_REQUEST',
    title: `Service Order ${action === 'APPROVE' ? 'Approved' : action === 'REJECT' ? 'Rejected' : 'Modification Requested'}`,
    message: action === 'APPROVE' 
      ? `Your service order has been approved${estimatedDeliveryDate ? ` with estimated delivery: ${new Date(estimatedDeliveryDate).toLocaleDateString()}` : ''}`
      : action === 'REJECT'
      ? 'Your service order has been rejected. Please check the notes for details.'
      : 'Modifications have been requested for your service order. Please review and resubmit.',
    data: {
      serviceOrderId: serviceOrder.id,
      action,
      approvedBy: approver.fullName,
      estimatedDeliveryDate,
      priority
    },
    priority: action === 'REJECT' ? 'HIGH' : priority === 'URGENT' ? 'HIGH' : 'NORMAL'
  })

  // Notify service department if approved
  if (action === 'APPROVE') {
    const serviceDeptUsers = await tx.user.findMany({
      where: { role: 'SERVICE_DEPARTMENT', isActive: true }
    })

    for (const user of serviceDeptUsers) {
      if (user.id !== serviceOrder.requestedBy.id) {
        notifications.push({
          userId: user.id,
          type: 'SERVICE_REQUEST',
          title: 'Service Order Approved',
          message: `Service order for ${serviceOrder.requestedBy.fullName} has been approved`,
          data: {
            serviceOrderId: serviceOrder.id,
            requestedBy: serviceOrder.requestedBy.fullName,
            approvedBy: approver.fullName
          }
        })
      }
    }
  }

  if (notifications.length > 0) {
    await tx.systemNotification.createMany({
      data: notifications
    })
  }
}

async function createInventoryReservations(tx: any, serviceOrder: any) {
  // Reserve inventory for approved items
  for (const item of serviceOrder.items) {
    const inventoryItem = await tx.inventoryItem.findFirst({
      where: { partId: item.part.partId }
    })

    if (inventoryItem && item.quantityApproved) {
      // Create reservation transaction
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventoryItem.id,
          type: 'RESERVED',
          quantity: -item.quantityApproved,
          reason: `Reserved for service order ${serviceOrder.id}`,
          orderId: null,
          performedById: serviceOrder.requestedBy.id
        }
      })

      // Update inventory quantities
      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantityReserved: {
            increment: item.quantityApproved
          }
        }
      })
    }
  }
}