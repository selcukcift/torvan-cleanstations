import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PrismaClient } from '@prisma/client'
import { createAPIResponse, createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '@/lib/apiResponse'
import { z } from 'zod'

const prisma = new PrismaClient()

const WorkInstructionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assemblyId: z.string().optional(),
  version: z.string().default('1.0'),
  isActive: z.boolean().default(true),
  steps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    title: z.string().min(1, 'Step title is required'),
    description: z.string().min(1, 'Step description is required'),
    estimatedMinutes: z.number().int().positive().optional(),
    images: z.array(z.string()).default([]),
    videos: z.array(z.string()).default([]),
    checkpoints: z.array(z.string()).default([]),
    requiredToolIds: z.array(z.string()).default([])
  })).default([])
})

// GET /api/v1/assembly/work-instructions - List all work instructions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createAPIResponse(createUnauthorizedResponse())
    }

    const { searchParams } = new URL(request.url)
    const assemblyId = searchParams.get('assemblyId')
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build filter conditions
    const where: any = {}
    if (assemblyId) where.assemblyId = assemblyId
    if (isActive !== null) where.isActive = isActive === 'true'

    // Get work instructions with steps and tools
    const [workInstructions, total] = await Promise.all([
      prisma.workInstruction.findMany({
        where,
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
          _count: {
            select: { steps: true }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.workInstruction.count({ where })
    ])

    // Format the response
    const formattedInstructions = workInstructions.map(instruction => ({
      id: instruction.id,
      title: instruction.title,
      description: instruction.description,
      version: instruction.version,
      isActive: instruction.isActive,
      assemblyId: instruction.assemblyId,
      assembly: instruction.assembly,
      stepCount: instruction._count.steps,
      steps: instruction.steps.map(step => ({
        id: step.id,
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedMinutes: step.estimatedMinutes,
        images: step.images,
        videos: step.videos,
        checkpoints: step.checkpoints,
        requiredTools: step.requiredTools.map(rt => rt.tool)
      })),
      createdAt: instruction.createdAt,
      updatedAt: instruction.updatedAt
    }))

    return createAPIResponse(
      createSuccessResponse(formattedInstructions, {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    )

  } catch (error) {
    console.error('Error fetching work instructions:', error)
    return createAPIResponse(
      createErrorResponse('FETCH_WORK_INSTRUCTIONS_FAILED', 'Failed to fetch work instructions')
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/v1/assembly/work-instructions - Create new work instruction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createAPIResponse(createUnauthorizedResponse())
    }

    // Check permissions - only coordinators and admins can create work instructions
    const allowedRoles = ['ADMIN', 'PRODUCTION_COORDINATOR']
    if (!allowedRoles.includes(session.user.role)) {
      return createAPIResponse(
        createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only production coordinators and admins can create work instructions'),
        403
      )
    }

    const body = await request.json()
    const validatedData = WorkInstructionSchema.parse(body)

    // Create work instruction with steps in a transaction
    const workInstruction = await prisma.$transaction(async (tx) => {
      // Create the work instruction
      const instruction = await tx.workInstruction.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          assemblyId: validatedData.assemblyId,
          version: validatedData.version,
          isActive: validatedData.isActive
        }
      })

      // Create the steps
      if (validatedData.steps.length > 0) {
        await tx.workInstructionStep.createMany({
          data: validatedData.steps.map(step => ({
            workInstructionId: instruction.id,
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            estimatedMinutes: step.estimatedMinutes,
            images: step.images,
            videos: step.videos,
            checkpoints: step.checkpoints
          }))
        })

        // Create tool relationships using TaskTool model
        for (const step of validatedData.steps) {
          if (step.requiredToolIds.length > 0) {
            const createdStep = await tx.workInstructionStep.findFirst({
              where: {
                workInstructionId: instruction.id,
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

      return instruction
    })

    // Fetch the complete work instruction with relations
    const completeInstruction = await prisma.workInstruction.findUnique({
      where: { id: workInstruction.id },
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
      createSuccessResponse(completeInstruction, {}, 'Work instruction created successfully'),
      201
    )

  } catch (error) {
    console.error('Error creating work instruction:', error)
    
    if (error instanceof z.ZodError) {
      return createAPIResponse(
        createErrorResponse('VALIDATION_ERROR', 'Invalid work instruction data', error.errors),
        400
      )
    }

    return createAPIResponse(
      createErrorResponse('CREATE_WORK_INSTRUCTION_FAILED', 'Failed to create work instruction')
    )
  } finally {
    await prisma.$disconnect()
  }
}