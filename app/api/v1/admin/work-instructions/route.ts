import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const WorkInstructionStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  description: z.string().min(1, 'Step description is required'),
  notes: z.string().optional()
})

const WorkInstructionCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  steps: z.array(WorkInstructionStepSchema).min(1, 'At least one step is required')
})

const WorkInstructionUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  steps: z.array(WorkInstructionStepSchema).optional()
})

// GET /api/v1/admin/work-instructions - Get all work instructions
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const instructions = await prisma.workInstruction.findMany({
      include: {
        steps: {
          orderBy: {
            stepNumber: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      instructions
    })
  } catch (error) {
    console.error('Error fetching work instructions:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/v1/admin/work-instructions - Create new work instruction
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = WorkInstructionCreateSchema.parse(body)

    const instruction = await prisma.workInstruction.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        steps: {
          create: validatedData.steps.map(step => ({
            stepNumber: step.stepNumber,
            description: step.description,
            notes: step.notes
          }))
        }
      },
      include: {
        steps: {
          orderBy: {
            stepNumber: 'asc'
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      instruction,
      message: 'Work instruction created successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error creating work instruction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
}