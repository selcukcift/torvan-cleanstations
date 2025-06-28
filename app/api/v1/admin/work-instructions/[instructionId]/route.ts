import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const WorkInstructionStepSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, "Step title is required"),
  description: z.string().min(1, "Step description is required"),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  checkpoints: z.array(z.string()).optional(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const WorkInstructionUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().nullable(),
  assemblyId: z.string().optional().nullable(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  steps: z.array(WorkInstructionStepSchema).optional(),
});

export async function GET(request: Request, { params }: { params: { instructionId: string } }) {
  try {
    const { instructionId } = params;
    const workInstruction = await prisma.workInstruction.findUnique({
      where: { id: instructionId },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!workInstruction) {
      return NextResponse.json({ message: "Work instruction not found" }, { status: 404 });
    }

    return NextResponse.json({ workInstruction });
  } catch (error) {
    console.error("Error fetching work instruction:", error);
    return NextResponse.json({ message: "Failed to fetch work instruction" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { instructionId: string } }) {
  try {
    const { instructionId } = params;
    const body = await request.json();
    const validatedData = WorkInstructionUpdateSchema.parse(body);

    const { steps, ...rest } = validatedData;

    const updateData: any = { ...rest };

    if (steps) {
      const stepActions = steps.map(step => {
        if (step._action === 'create') {
          // Ensure stepNumber is set for new steps
          if (!step.stepNumber) {
            throw new Error("New steps must have a stepNumber");
          }
          return prisma.workInstructionStep.create({
            data: { ...step, workInstructionId: instructionId }
          });
        } else if (step._action === 'update') {
          if (!step.id) {
            throw new Error("Updated steps must have an ID");
          }
          return prisma.workInstructionStep.update({
            where: { id: step.id },
            data: step
          });
        } else if (step._action === 'delete') {
          if (!step.id) {
            throw new Error("Deleted steps must have an ID");
          }
          return prisma.workInstructionStep.delete({
            where: { id: step.id }
          });
        } else {
          // Default to update if no action is specified and ID exists
          if (step.id) {
            return prisma.workInstructionStep.update({
              where: { id: step.id },
              data: step
            });
          } else {
            // This case should ideally not happen if frontend manages _action correctly
            throw new Error("Invalid step action or missing ID");
          }
        }
      });
      await prisma.$transaction(stepActions);
    }

    const updatedWorkInstruction = await prisma.workInstruction.update({
      where: { id: instructionId },
      data: updateData,
      include: {
        steps: true,
      },
    });

    return NextResponse.json({ message: "Work instruction updated successfully", workInstruction: updatedWorkInstruction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation Error", errors: error.errors }, { status: 400 });
    }
    console.error("Error updating work instruction:", error);
    return NextResponse.json({ message: "Failed to update work instruction" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { instructionId: string } }) {
  try {
    const { instructionId } = params;
    await prisma.workInstruction.delete({
      where: { id: instructionId },
    });
    return NextResponse.json({ message: "Work instruction deleted successfully" });
  } catch (error) {
    console.error("Error deleting work instruction:", error);
    return NextResponse.json({ message: "Failed to delete work instruction" }, { status: 500 });
  }
}
