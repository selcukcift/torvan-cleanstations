import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assemblyId: string }> }
) {
  try {
    const { assemblyId } = await params

    const assembly = await prisma.assembly.findUnique({
      where: { assemblyId },
      include: {
        components: {
          include: {
            childPart: true,
            childAssembly: true
          }
        }
      }
    })

    if (!assembly) {
      return NextResponse.json(
        { success: false, message: 'Assembly not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: assembly
    })

  } catch (error) {
    console.error('Error fetching assembly:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch assembly',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}