import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const TaskTemplateStepPartSchema = z.object({
  id: z.string().optional(),
  partId: z.string().min(1, "Part ID is required"),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional().nullable(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const TaskTemplateStepToolSchema = z.object({
  id: z.string().optional(),
  toolId: z.string().min(1, "Tool ID is required"),
  notes: z.string().optional().nullable(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const TaskTemplateStepSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, "Step title is required"),
  description: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  workInstructionId: z.string().optional().nullable(),
  qcFormTemplateItemId: z.string().optional().nullable(),
  requiredParts: z.array(TaskTemplateStepPartSchema).optional(),
  requiredTools: z.array(TaskTemplateStepToolSchema).optional(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const TaskTemplateUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional().nullable(),
  appliesToAssemblyType: z.string().optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
  steps: z.array(TaskTemplateStepSchema).optional(),
});

export async function GET(request: Request, { params }: { params: { taskListId: string } }) {
  try {
    const { taskListId } = params;
    const taskTemplate = await prisma.taskTemplate.findUnique({
      where: { id: taskListId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            requiredParts: true,
            requiredTools: true,
          },
        },
      },
    });

    if (!taskTemplate) {
      return NextResponse.json({ message: "Task list not found" }, { status: 404 });
    }

    return NextResponse.json({ taskTemplate });
  } catch (error) {
    console.error("Error fetching task list:", error);
    return NextResponse.json({ message: "Failed to fetch task list" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { taskListId: string } }) {
  try {
    const { taskListId } = params;
    const body = await request.json();
    const validatedData = TaskTemplateUpdateSchema.parse(body);

    const { steps, ...rest } = validatedData;

    const updateData: any = { ...rest };

    if (steps) {
      for (const step of steps) {
        if (step._action === 'create') {
          await prisma.taskTemplateStep.create({
            data: {
              ...step,
              taskTemplateId: taskListId,
              requiredParts: step.requiredParts ? { create: step.requiredParts } : undefined,
              requiredTools: step.requiredTools ? { create: step.requiredTools } : undefined,
            },
          });
        } else if (step._action === 'update') {
          if (!step.id) throw new Error("Step ID is required for update");
          await prisma.taskTemplateStep.update({
            where: { id: step.id },
            data: {
              ...step,
              requiredParts: step.requiredParts ? { 
                upsert: step.requiredParts.map(rp => ({
                  where: { id: rp.id || '' }, // Use a dummy ID if not present for create
                  update: rp,
                  create: rp,
                }))
              } : undefined,
              requiredTools: step.requiredTools ? { 
                upsert: step.requiredTools.map(rt => ({
                  where: { id: rt.id || '' }, // Use a dummy ID if not present for create
                  update: rt,
                  create: rt,
                }))
              } : undefined,
            },
          });
        } else if (step._action === 'delete') {
          if (!step.id) throw new Error("Step ID is required for delete");
          await prisma.taskTemplateStep.delete({
            where: { id: step.id },
          });
        }
      }
    }

    const updatedTaskTemplate = await prisma.taskTemplate.update({
      where: { id: taskListId },
      data: updateData,
      include: {
        steps: {
          include: {
            requiredParts: true,
            requiredTools: true,
          },
        },
      },
    });

    return NextResponse.json({ message: "Task list updated successfully", taskTemplate: updatedTaskTemplate });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation Error", errors: error.errors }, { status: 400 });
    }
    console.error("Error updating task list:", error);
    return NextResponse.json({ message: "Failed to update task list" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { taskListId: string } }) {
  try {
    const { taskListId } = params;
    await prisma.taskTemplate.delete({
      where: { id: taskListId },
    });
    return NextResponse.json({ message: "Task list deleted successfully" });
  } catch (error) {
    console.error("Error deleting task list:", error);
    return NextResponse.json({ message: "Failed to delete task list" }, { status: 500 });
  }
}
