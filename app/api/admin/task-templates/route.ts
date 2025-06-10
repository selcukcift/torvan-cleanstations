import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for TaskTemplate step
const TaskTemplateStepSchema = z.object({
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

// Validation schema for creating TaskTemplate
const TaskTemplateCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional().nullable(),
  appliesToAssemblyType: z.enum(['SINK', 'INSTROSINK', 'ENDOSCOPE']).optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  version: z.string().default('1.0'),
  isActive: z.boolean().default(true),
  steps: z.array(TaskTemplateStepSchema).min(1, 'At least one step is required')
});

// Validation schema for updating TaskTemplate
const TaskTemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  appliesToAssemblyType: z.enum(['SINK', 'INSTROSINK', 'ENDOSCOPE']).optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
  steps: z.array(TaskTemplateStepSchema).optional()
});

// GET /api/admin/task-templates - List all task templates
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const assemblyType = searchParams.get('assemblyType');
    const productFamily = searchParams.get('productFamily');

    // Build where clause
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (assemblyType) {
      where.appliesToAssemblyType = assemblyType;
    }
    if (productFamily) {
      where.appliesToProductFamily = productFamily;
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
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
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
        { version: 'desc' }
      ]
    });

    // Group templates by name to show version history
    const templateGroups = templates.reduce((groups, template) => {
      if (!groups[template.name]) {
        groups[template.name] = {
          name: template.name,
          appliesToAssemblyType: template.appliesToAssemblyType,
          appliesToProductFamily: template.appliesToProductFamily,
          activeVersion: null,
          versions: []
        };
      }
      
      if (template.isActive) {
        groups[template.name].activeVersion = template;
      }
      groups[template.name].versions.push(template);
      
      return groups;
    }, {} as Record<string, any>);

    return NextResponse.json({ 
      templates,
      templateGroups: Object.values(templateGroups)
    });
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return NextResponse.json({ error: 'Failed to fetch task templates' }, { status: 500 });
  }
}

// POST /api/admin/task-templates - Create a new task template
export async function POST(request: NextRequest) {
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
    const validatedData = TaskTemplateCreateSchema.parse(body);

    // Check if template name already exists for this version
    const existingTemplate = await prisma.taskTemplate.findFirst({
      where: {
        name: validatedData.name,
        version: validatedData.version
      }
    });

    if (existingTemplate) {
      return NextResponse.json({ 
        error: 'Task template with this name and version already exists' 
      }, { status: 400 });
    }

    const template = await prisma.$transaction(async (tx) => {
      // Create the task template
      const createdTemplate = await tx.taskTemplate.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          appliesToAssemblyType: validatedData.appliesToAssemblyType,
          appliesToProductFamily: validatedData.appliesToProductFamily,
          version: validatedData.version,
          isActive: validatedData.isActive
        }
      });

      // Create the steps
      for (const step of validatedData.steps) {
        const createdStep = await tx.taskTemplateStep.create({
          data: {
            taskTemplateId: createdTemplate.id,
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

      // Return the complete template with all relations
      return await tx.taskTemplate.findUnique({
        where: { id: createdTemplate.id },
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

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating task template:', error);
    return NextResponse.json({ error: 'Failed to create task template' }, { status: 500 });
  }
}