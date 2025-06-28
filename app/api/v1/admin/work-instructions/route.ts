import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const WorkInstructionStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, "Step title is required"),
  description: z.string().min(1, "Step description is required"),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  checkpoints: z.array(z.string()).optional(),
});

const WorkInstructionCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assemblyId: z.string().optional().nullable(),
  version: z.string().default("1.0"),
  isActive: z.boolean().default(true),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  steps: z.array(WorkInstructionStepSchema).min(1, "At least one step is required"),
});

export async function GET() {
  try {
    const workInstructions = await prisma.workInstruction.findMany({
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json({ workInstructions });
  } catch (error) {
    console.error("Error fetching work instructions:", error);
    return NextResponse.json({ message: "Failed to fetch work instructions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = WorkInstructionCreateSchema.parse(body);

    const { steps, ...rest } = validatedData;

    const newWorkInstruction = await prisma.workInstruction.create({
      data: {
        ...rest,
        steps: {
          create: steps,
        },
      },
      include: {
        steps: true,
      },
    });

    return NextResponse.json({ message: "Work instruction created successfully", workInstruction: newWorkInstruction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation Error", errors: error.errors }, { status: 400 });
    }
    console.error("Error creating work instruction:", error);
    return NextResponse.json({ message: "Failed to create work instruction" }, { status: 500 });
  }
}
