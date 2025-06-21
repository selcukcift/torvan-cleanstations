import { NextRequest, NextResponse } from 'next/server'
import { generateOrderSingleSourceOfTruth } from '@/lib/orderSingleSourceOfTruth'
import { getAuthUser } from '@/lib/auth'

interface RouteParams {
  params: {
    orderId: string
  }
}

/**
 * POST /api/orders/[orderId]/regenerate-source-of-truth
 * Regenerate the complete single source of truth JSON for an order
 * Useful when BOM service data has been updated or configuration has changed
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    console.log(`🔄 Regenerating single source of truth for order: ${params.orderId}`)

    // Check authentication
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user permissions (only admins and production coordinators can regenerate)
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Only ADMIN and PRODUCTION_COORDINATOR can regenerate single source of truth.' },
        { status: 403 }
      )
    }

    // Regenerate the single source of truth JSON
    console.log(`\n🔄 REGENERATING SINGLE SOURCE OF TRUTH`)
    console.log(`📋 Order ID: ${params.orderId}`)
    console.log(`👤 Requested by: ${user.username} (${user.role})`)
    
    const singleSourceOfTruthPath = await generateOrderSingleSourceOfTruth(params.orderId)

    console.log(`\n🎯 REGENERATION COMPLETE`)
    console.log(`✅ Single source of truth regenerated for order: ${params.orderId}`)
    console.log(`📁 New file saved to: ${singleSourceOfTruthPath}`)
    console.log(`🔄 Previous version overwritten with updated data`)

    return NextResponse.json({
      success: true,
      filePath: singleSourceOfTruthPath,
      message: 'Single source of truth regenerated successfully'
    })

  } catch (error) {
    console.error(`❌ Error regenerating single source of truth for order ${params.orderId}:`, error)

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to regenerate single source of truth' },
      { status: 500 }
    )
  }
}