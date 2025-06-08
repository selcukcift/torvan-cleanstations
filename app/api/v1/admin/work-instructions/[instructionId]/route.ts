import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const WorkInstructionStepSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  description: z.string().min(1, 'Step description is required'),
  notes: z.string().optional()
})

const WorkInstructionUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  steps: z.array(WorkInstructionStepSchema).optional()
})

// GET /api/v1/admin/work-instructions/[instructionId] - Get single work instruction
export async function GET(
  request: NextRequest,
  { params }: { params: { instructionId: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const instruction = await prisma.workInstruction.findUnique({
      where: { id: params.instructionId },
      include: {
        steps: {
          orderBy: {
            stepNumber: 'asc'
          }
        }
      }
    })

    if (!instruction) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work instruction not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      instruction
    })
  } catch (error) {
    console.error('Error fetching work instruction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// PUT /api/v1/admin/work-instructions/[instructionId] - Update work instruction
export async function PUT(
  request: NextRequest,
  { params }: { params: { instructionId: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = WorkInstructionUpdateSchema.parse(body)

    // Check if instruction exists
    const existingInstruction = await prisma.workInstruction.findUnique({
      where: { id: params.instructionId }
    })

    if (!existingInstruction) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work instruction not found' 
      }, { status: 404 })
    }

    // Update instruction and steps in a transaction
    const instruction = await prisma.$transaction(async (tx) => {
      // Update the main instruction
      const updatedInstruction = await tx.workInstruction.update({
        where: { id: params.instructionId },
        data: {
          title: validatedData.title,
          description: validatedData.description
        }
      })

      // If steps are provided, replace all steps
      if (validatedData.steps) {
        // Delete existing steps
        await tx.workInstructionStep.deleteMany({
          where: { workInstructionId: params.instructionId }
        })

        // Create new steps
        await tx.workInstructionStep.createMany({
          data: validatedData.steps.map(step => ({
            workInstructionId: params.instructionId,
            stepNumber: step.stepNumber,
            description: step.description,
            notes: step.notes
          }))
        })
      }

      // Return updated instruction with steps
      return await tx.workInstruction.findUnique({
        where: { id: params.instructionId },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      instruction,
      message: 'Work instruction updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error updating work instruction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE /api/v1/admin/work-instructions/[instructionId] - Delete work instruction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { instructionId: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Check if instruction exists
    const existingInstruction = await prisma.workInstruction.findUnique({
      where: { id: params.instructionId }
    })

    if (!existingInstruction) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work instruction not found' 
      }, { status: 404 })
    }

    // Delete instruction (steps will be deleted due to cascade)
    await prisma.workInstruction.delete({
      where: { id: params.instructionId }
    })

    return NextResponse.json({
      success: true,
      message: 'Work instruction deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting work instruction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}