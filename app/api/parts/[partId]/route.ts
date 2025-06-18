import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const { partId } = await params

    const part = await prisma.part.findUnique({
      where: { partId }
    })

    if (!part) {
      return NextResponse.json(
        { success: false, message: 'Part not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: part
    })

  } catch (error) {
    console.error('Error fetching part:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch part',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}