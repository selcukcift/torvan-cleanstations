import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PrismaClient } from '@prisma/client'
import { createAPIResponse, createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createNotFoundResponse } from '@/lib/apiResponse'
import { z } from 'zod'

const prisma = new PrismaClient()

const UpdateWorkInstructionSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  assemblyId: z.string().optional(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
  steps: z.array(z.object({
    id: z.string().optional(), // For updates
    stepNumber: z.number().int().positive(),
    title: z.string().min(1, 'Step title is required'),
    description: z.string().min(1, 'Step description is required'),
    estimatedMinutes: z.number().int().positive().optional(),
    images: z.array(z.string()).default([]),
    videos: z.array(z.string()).default([]),
    checkpoints: z.array(z.string()).default([]),
    requiredToolIds: z.array(z.string()).default([])
  })).optional()
})

interface RouteParams {
  params: { instructionId: string }
}

// GET /api/v1/assembly/work-instructions/[instructionId] - Get specific work instruction
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createAPIResponse(createUnauthorizedResponse())
    }

    const { instructionId } = params

    const workInstruction = await prisma.workInstruction.findUnique({
      where: { id: instructionId },
      include: {
        assembly: {
          select: { id: true, assemblyId: true, assemblyName: true }
        },
        steps: {
          include: {
            requiredTools: {
              include: {
                tool: true
              }
            }
          },
          orderBy: { stepNumber: 'asc' }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            assignedTo: {
              select: { id: true, name: true, role: true }
            }
          }
        }
      }
    })

    if (!workInstruction) {
      return createAPIResponse(createNotFoundResponse('Work instruction not found'))
    }

    // Format the response
    const formattedInstruction = {
      id: workInstruction.id,
      title: workInstruction.title,
      description: workInstruction.description,
      version: workInstruction.version,
      isActive: workInstruction.isActive,
      assemblyId: workInstruction.assemblyId,
      assembly: workInstruction.assembly,
      steps: workInstruction.steps.map(step => ({
        id: step.id,
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedMinutes: step.estimatedMinutes,
        images: step.images,
        videos: step.videos,
        checkpoints: step.checkpoints,
        requiredTools: step.requiredTools.map(rt => ({
          id: rt.tool.id,
          name: rt.tool.name,
          description: rt.tool.description,
          category: rt.tool.category
        }))
      })),
      tasks: workInstruction.tasks,
      totalEstimatedMinutes: workInstruction.steps.reduce((total, step) => 
        total + (step.estimatedMinutes || 0), 0
      ),
      createdAt: workInstruction.createdAt,
      updatedAt: workInstruction.updatedAt
    }

    return createAPIResponse(createSuccessResponse(formattedInstruction))

  } catch (error) {
    console.error('Error fetching work instruction:', error)
    return createAPIResponse(
      createErrorResponse('FETCH_WORK_INSTRUCTION_FAILED', 'Failed to fetch work instruction')
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PATCH /api/v1/assembly/work-instructions/[instructionId] - Update work instruction
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createAPIResponse(createUnauthorizedResponse())
    }

    // Check permissions
    const allowedRoles = ['ADMIN', 'PRODUCTION_COORDINATOR']
    if (!allowedRoles.includes(session.user.role)) {
      return createAPIResponse(
        createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only production coordinators and admins can update work instructions'),
        403
      )
    }

    const { instructionId } = params
    const body = await request.json()
    const validatedData = UpdateWorkInstructionSchema.parse(body)

    // Check if work instruction exists
    const existingInstruction = await prisma.workInstruction.findUnique({
      where: { id: instructionId },
      include: { steps: true }
    })

    if (!existingInstruction) {
      return createAPIResponse(createNotFoundResponse('Work instruction not found'))
    }

    // Update work instruction in a transaction
    const updatedInstruction = await prisma.$transaction(async (tx) => {
      // Update the main instruction
      const instruction = await tx.workInstruction.update({
        where: { id: instructionId },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          assemblyId: validatedData.assemblyId,
          version: validatedData.version,
          isActive: validatedData.isActive
        }
      })

      // If steps are provided, update them
      if (validatedData.steps) {
        // Delete existing steps and their tool relationships
        await tx.taskTool.deleteMany({
          where: {
            step: {
              workInstructionId: instructionId
            }
          }
        })
        
        await tx.workInstructionStep.deleteMany({
          where: { workInstructionId: instructionId }
        })

        // Create new steps
        if (validatedData.steps.length > 0) {
          await tx.workInstructionStep.createMany({
            data: validatedData.steps.map(step => ({
              workInstructionId: instructionId,
              stepNumber: step.stepNumber,
              title: step.title,
              description: step.description,
              estimatedMinutes: step.estimatedMinutes,
              images: step.images,
              videos: step.videos,
              checkpoints: step.checkpoints
            }))
          })

          // Create tool relationships
          for (const step of validatedData.steps) {
            if (step.requiredToolIds.length > 0) {
              const createdStep = await tx.workInstructionStep.findFirst({
                where: {
                  workInstructionId: instructionId,
                  stepNumber: step.stepNumber
                }
              })

              if (createdStep) {
                await tx.taskTool.createMany({
                  data: step.requiredToolIds.map(toolId => ({
                    stepId: createdStep.id,
                    toolId
                  }))
                })
              }
            }
          }
        }
      }

      return instruction
    })

    // Fetch the updated instruction with all relations
    const completeInstruction = await prisma.workInstruction.findUnique({
      where: { id: instructionId },
      include: {
        assembly: true,
        steps: {
          include: {
            requiredTools: {
              include: {
                tool: true
              }
            }
          },
          orderBy: { stepNumber: 'asc' }
        }
      }
    })

    return createAPIResponse(
      createSuccessResponse(completeInstruction, {}, 'Work instruction updated successfully')
    )

  } catch (error) {
    console.error('Error updating work instruction:', error)
    
    if (error instanceof z.ZodError) {
      return createAPIResponse(
        createErrorResponse('VALIDATION_ERROR', 'Invalid work instruction data', error.errors),
        400
      )
    }

    return createAPIResponse(
      createErrorResponse('UPDATE_WORK_INSTRUCTION_FAILED', 'Failed to update work instruction')
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE /api/v1/assembly/work-instructions/[instructionId] - Delete work instruction
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createAPIResponse(createUnauthorizedResponse())
    }

    // Check permissions
    const allowedRoles = ['ADMIN', 'PRODUCTION_COORDINATOR']
    if (!allowedRoles.includes(session.user.role)) {
      return createAPIResponse(
        createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only production coordinators and admins can delete work instructions'),
        403
      )
    }

    const { instructionId } = params

    // Check if work instruction exists and if it's safe to delete
    const existingInstruction = await prisma.workInstruction.findUnique({
      where: { id: instructionId },
      include: {
        tasks: { select: { id: true } },
        _count: { select: { tasks: true } }
      }
    })

    if (!existingInstruction) {
      return createAPIResponse(createNotFoundResponse('Work instruction not found'))
    }

    // Prevent deletion if there are active tasks using this instruction
    if (existingInstruction._count.tasks > 0) {
      return createAPIResponse(
        createErrorResponse(
          'CANNOT_DELETE_IN_USE', 
          `Cannot delete work instruction as it is being used by ${existingInstruction._count.tasks} task(s)`,
          { taskCount: existingInstruction._count.tasks }
        ),
        409
      )
    }

    // Delete work instruction and related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete tool relationships first
      await tx.taskTool.deleteMany({
        where: {
          step: {
            workInstructionId: instructionId
          }
        }
      })

      // Delete steps
      await tx.workInstructionStep.deleteMany({
        where: { workInstructionId: instructionId }
      })

      // Delete the work instruction
      await tx.workInstruction.delete({
        where: { id: instructionId }
      })
    })

    return createAPIResponse(
      createSuccessResponse(null, {}, 'Work instruction deleted successfully')
    )

  } catch (error) {
    console.error('Error deleting work instruction:', error)
    return createAPIResponse(
      createErrorResponse('DELETE_WORK_INSTRUCTION_FAILED', 'Failed to delete work instruction')
    )
  } finally {
    await prisma.$disconnect()
  }
}