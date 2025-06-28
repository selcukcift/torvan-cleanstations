import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const TaskTemplateStepPartSchema = z.object({
  partId: z.string().min(1, "Part ID is required"),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional().nullable(),
});

const TaskTemplateStepToolSchema = z.object({
  toolId: z.string().min(1, "Tool ID is required"),
  notes: z.string().optional().nullable(),
});

const TaskTemplateStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, "Step title is required"),
  description: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  workInstructionId: z.string().optional().nullable(),
  qcFormTemplateItemId: z.string().optional().nullable(),
  requiredParts: z.array(TaskTemplateStepPartSchema).optional(),
  requiredTools: z.array(TaskTemplateStepToolSchema).optional(),
});

const TaskTemplateCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  appliesToAssemblyType: z.string().optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  version: z.string().default("1.0"),
  isActive: z.boolean().default(true),
  steps: z.array(TaskTemplateStepSchema).min(1, "At least one step is required"),
});

export async function GET() {
  try {
    const taskTemplates = await prisma.taskTemplate.findMany({
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            requiredParts: true,
            requiredTools: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json({ taskTemplates });
  } catch (error) {
    console.error("Error fetching task templates:", error);
    return NextResponse.json({ message: "Failed to fetch task templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = TaskTemplateCreateSchema.parse(body);

    const { steps, ...rest } = validatedData;

    const newTaskTemplate = await prisma.taskTemplate.create({
      data: {
        ...rest,
        steps: {
          create: steps.map(step => ({
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            estimatedMinutes: step.estimatedMinutes,
            workInstructionId: step.workInstructionId,
            qcFormTemplateItemId: step.qcFormTemplateItemId,
            ...(step.requiredParts && { requiredParts: { create: step.requiredParts } }),
            ...(step.requiredTools && { requiredTools: { create: step.requiredTools } }),
          })),
        },
      },
      include: {
        steps: {
          include: {
            requiredParts: true,
            requiredTools: true,
          },
        },
      },
    });

    return NextResponse.json({ message: "Task list created successfully", taskTemplate: newTaskTemplate }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation Error", errors: error.errors }, { status: 400 });
    }
    console.error("Error creating task list:", error);
    return NextResponse.json({ message: "Failed to create task list" }, { status: 500 });
  }
}
