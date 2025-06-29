import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication for database testing endpoint
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required for database testing'
        },
        { status: 403 }
      )
    }

    // Test database connection
    const [partCount, assemblyCount] = await Promise.all([
      prisma.part.count(),
      prisma.assembly.count()
    ])
    
    // Test fetching a specific assembly
    const testAssembly = await prisma.assembly.findFirst({
      where: {
        assemblyId: 'T2-DL27-KIT'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        partCount,
        assemblyCount,
        testAssembly: testAssembly ? 'Found' : 'Not found',
        testAssemblyData: testAssembly
      }
    })
  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}