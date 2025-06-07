import { NextRequest, NextResponse } from 'next/server'
// [Per Coding Prompt Chains v5 - Hybrid Backend]
// Use src/services/configuratorService.js for all configuration data
import configuratorService from '@/lib/configuratorService.native'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Add authentication as per Prompt 2.B
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { basinConfigurations } = body
    
    if (!basinConfigurations || !Array.isArray(basinConfigurations)) {
      return NextResponse.json(
        { success: false, message: 'Basin configurations array is required' },
        { status: 400 }
      )
    }
    
    const data = await configuratorService.getControlBox(basinConfigurations)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error fetching control box:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to determine control box' },
      { status: 500 }
    )
  }
}