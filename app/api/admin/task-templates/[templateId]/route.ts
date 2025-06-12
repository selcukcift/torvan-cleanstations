import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for TaskTemplate step (for updates)
const TaskTemplateStepUpdateSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, 'Step title is required'),
  description: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  workInstructionId: z.string().optional().nullable(),
  qcFormTemplateItemId: z.string().optional().nullable(),
  requiredTools: z.array(z.object({
    toolId: z.string(),
    notes: z.string().optional().nullable()
  })).default([]),
  requiredParts: z.array(z.object({
    partId: z.string(),
    quantity: z.number().int().positive().default(1),
    notes: z.string().optional().nullable()
  })).default([]),
  _action: z.enum(['create', 'update', 'delete']).optional()
});

// Validation schema for updating TaskTemplate
const TaskTemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  appliesToAssemblyType: z.enum(['SINK', 'INSTROSINK', 'ENDOSCOPE']).optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
  steps: z.array(TaskTemplateStepUpdateSchema).optional()
});

// GET /api/admin/task-templates/[templateId] - Get a specific task template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!checkUserRole(user, ['ADMIN', 'PRODUCTION_COORDINATOR', 'ASSEMBLER'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            workInstruction: {
              select: {
                id: true,
                title: true,
                description: true,
                estimatedMinutes: true,
                steps: {
                  orderBy: { stepNumber: 'asc' },
                  select: {
                    id: true,
                    stepNumber: true,
                    title: true,
                    description: true,
                    estimatedMinutes: true
                  }
                }
              }
            },
            qcFormTemplateItem: {
              select: {
                id: true,
                section: true,
                checklistItem: true,
                itemType: true,
                options: true,
                expectedValue: true,
                isRequired: true,
                repeatPer: true,
                applicabilityCondition: true,
                defaultValue: true,
                notesPrompt: true
              }
            },
            requiredTools: {
              include: {
                tool: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    category: true,
                    isActive: true
                  }
                }
              }
            },
            requiredParts: {
              include: {
                part: {
                  select: {
                    partId: true,
                    name: true,
                    type: true,
                    unitOfMeasure: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Task template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching task template:', error);
    return NextResponse.json({ error: 'Failed to fetch task template' }, { status: 500 });
  }
}

// PUT /api/admin/task-templates/[templateId] - Update a task template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!checkUserRole(user, ['ADMIN', 'PRODUCTION_COORDINATOR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = TaskTemplateUpdateSchema.parse(body);

    // Check if template exists
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: {
          include: {
            requiredTools: true,
            requiredParts: true
          }
        }
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Task template not found' }, { status: 404 });
    }

    const template = await prisma.$transaction(async (tx) => {
      // Update the task template
      await tx.taskTemplate.update({
        where: { id: templateId },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          appliesToAssemblyType: validatedData.appliesToAssemblyType,
          appliesToProductFamily: validatedData.appliesToProductFamily,
          version: validatedData.version,
          isActive: validatedData.isActive
        }
      });

      // Handle steps updates if provided
      if (validatedData.steps) {
        // Delete all existing steps and their relations
        for (const existingStep of existingTemplate.steps) {
          await tx.taskTemplateStepTool.deleteMany({
            where: { taskTemplateStepId: existingStep.id }
          });
          await tx.taskTemplateStepPart.deleteMany({
            where: { taskTemplateStepId: existingStep.id }
          });
        }
        
        await tx.taskTemplateStep.deleteMany({
          where: { taskTemplateId: templateId }
        });

        // Create new steps
        for (const step of validatedData.steps) {
          const createdStep = await tx.taskTemplateStep.create({
            data: {
              taskTemplateId: templateId,
              stepNumber: step.stepNumber,
              title: step.title,
              description: step.description,
              estimatedMinutes: step.estimatedMinutes,
              workInstructionId: step.workInstructionId,
              qcFormTemplateItemId: step.qcFormTemplateItemId
            }
          });

          // Create required tools
          if (step.requiredTools.length > 0) {
            await tx.taskTemplateStepTool.createMany({
              data: step.requiredTools.map(tool => ({
                taskTemplateStepId: createdStep.id,
                toolId: tool.toolId,
                notes: tool.notes
              }))
            });
          }

          // Create required parts
          if (step.requiredParts.length > 0) {
            await tx.taskTemplateStepPart.createMany({
              data: step.requiredParts.map(part => ({
                taskTemplateStepId: createdStep.id,
                partId: part.partId,
                quantity: part.quantity,
                notes: part.notes
              }))
            });
          }
        }
      }

      // Return the updated template with all relations
      return await tx.taskTemplate.findUnique({
        where: { id: templateId },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
            include: {
              workInstruction: {
                select: {
                  id: true,
                  title: true,
                  description: true
                }
              },
              qcFormTemplateItem: {
                select: {
                  id: true,
                  section: true,
                  checklistItem: true,
                  itemType: true
                }
              },
              requiredTools: {
                include: {
                  tool: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      category: true
                    }
                  }
                }
              },
              requiredParts: {
                include: {
                  part: {
                    select: {
                      partId: true,
                      name: true,
                      type: true,
                      unitOfMeasure: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating task template:', error);
    return NextResponse.json({ error: 'Failed to update task template' }, { status: 500 });
  }
}

// DELETE /api/admin/task-templates/[templateId] - Delete a task template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!checkUserRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if template exists
    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: {
          include: {
            instantiatedTasks: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Task template not found' }, { status: 404 });
    }

    // Check if template has been used to create tasks
    const hasInstantiatedTasks = template.steps.some(step => step.instantiatedTasks.length > 0);
    
    if (hasInstantiatedTasks) {
      return NextResponse.json({ 
        error: 'Cannot delete task template that has been used to create tasks. Consider deactivating it instead.' 
      }, { status: 400 });
    }

    // Delete template and all related data (cascade should handle this)
    await prisma.taskTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task template:', error);
    return NextResponse.json({ error: 'Failed to delete task template' }, { status: 500 });
  }
}