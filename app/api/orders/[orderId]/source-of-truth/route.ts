import { NextRequest, NextResponse } from 'next/server'
import { getOrderSingleSourceOfTruth, updateOrderWorkflowState, generateOrderSingleSourceOfTruth } from '@/lib/orderSingleSourceOfTruth'
import { getAuthUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    orderId: string
  }>
}

/**
 * GET /api/orders/[orderId]/source-of-truth
 * Retrieve the complete single source of truth JSON for an order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params
    console.log(`🔍 Fetching single source of truth for order: ${orderId}`)

    // Check authentication
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the single source of truth JSON - generate if it doesn't exist
    let singleSourceOfTruth
    try {
      singleSourceOfTruth = await getOrderSingleSourceOfTruth(orderId)
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.log(`📋 Single source of truth not found for order ${orderId}, generating...`)
        await generateOrderSingleSourceOfTruth(orderId)
        singleSourceOfTruth = await getOrderSingleSourceOfTruth(orderId)
        console.log(`✅ Single source of truth generated and retrieved for order: ${orderId}`)
      } else {
        throw error
      }
    }

    console.log(`✅ Single source of truth ready for order: ${orderId}`)

    return NextResponse.json({
      success: true,
      data: singleSourceOfTruth,
      message: 'Single source of truth retrieved successfully'
    })

  } catch (error) {
    const { orderId } = await params
    console.error(`❌ Error fetching single source of truth for order ${orderId}:`, error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'Single source of truth not found for this order' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to retrieve single source of truth' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/orders/[orderId]/source-of-truth
 * Update workflow state and additional data in the single source of truth
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params
    console.log(`🔄 Updating single source of truth for order: ${orderId}`)

    // Check authentication
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user permissions (only certain roles can update workflow state)
    const allowedRoles = ['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON', 'PROCUREMENT_SPECIALIST']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to update workflow state' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { stage, additionalData } = body

    if (!stage) {
      return NextResponse.json(
        { success: false, message: 'Workflow stage is required' },
        { status: 400 }
      )
    }

    // Valid workflow stages
    const validStages = [
      'ORDER_CREATED',
      'BOM_REVIEW',
      'PROCUREMENT_PLANNING',
      'PROCUREMENT_STARTED',
      'MANUFACTURING_SCHEDULING',
      'MANUFACTURING_STARTED',
      'QUALITY_CONTROL_STARTED',
      'SHIPPING_STARTED',
      'ORDER_COMPLETED'
    ]

    if (!validStages.includes(stage)) {
      return NextResponse.json(
        { success: false, message: `Invalid workflow stage. Valid stages: ${validStages.join(', ')}` },
        { status: 400 }
      )
    }

    // Update the workflow state
    await updateOrderWorkflowState(orderId, stage, additionalData)

    console.log(`✅ Single source of truth updated for order: ${orderId}, stage: ${stage}`)

    return NextResponse.json({
      success: true,
      message: `Workflow state updated to: ${stage}`
    })

  } catch (error) {
    const { orderId } = await params
    console.error(`❌ Error updating single source of truth for order ${orderId}:`, error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, message: 'Single source of truth not found for this order' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update single source of truth' },
      { status: 500 }
    )
  }
}