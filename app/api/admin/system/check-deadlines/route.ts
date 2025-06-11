/**
 * Manual Deadline Check API
 * Allows administrators to manually trigger deadline checking
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { deadlineChecker } from '@/lib/deadlineChecker'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins and production coordinators can trigger this
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Run deadline check
    await deadlineChecker.checkDeadlines()

    return NextResponse.json({
      success: true,
      message: 'Deadline check completed successfully'
    })

  } catch (error) {
    console.error('Error running deadline check:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}