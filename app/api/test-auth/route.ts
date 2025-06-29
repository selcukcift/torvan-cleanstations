import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    
    return NextResponse.json({
      success: true,
      user: user,
      authenticated: !!user
    })
  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      user: null,
      authenticated: false
    }, { status: 500 })
  }
}