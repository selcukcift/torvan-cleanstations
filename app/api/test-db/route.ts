import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
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