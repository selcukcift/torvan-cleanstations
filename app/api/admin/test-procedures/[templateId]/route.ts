import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for TestProcedureStepTemplate (for updates)
const TestProcedureStepUpdateSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, 'Step title is required'),
  instruction: z.string().min(1, 'Instruction is required'),
  expectedOutcome: z.string().optional().nullable(),
  inputDataType: z.enum(['TEXT', 'NUMERIC', 'PASS_FAIL', 'SINGLE_SELECT', 'MULTI_SELECT', 'SCAN_SN', 'FILE_UPLOAD']),
  numericUnit: z.string().optional().nullable(),
  numericLowerLimit: z.number().optional().nullable(),
  numericUpperLimit: z.number().optional().nullable(),
  options: z.array(z.string()).optional().nullable(),
  isRequired: z.boolean().default(true),
  repeatPerInstance: z.string().optional().nullable(),
  linkedCalibrationEquipmentTypeId: z.string().optional().nullable(),
  _action: z.enum(['create', 'update', 'delete']).optional()
});

// Validation schema for updating TestProcedureTemplate
const TestProcedureUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  version: z.string().optional(),
  productFamily: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional().nullable(),
  steps: z.array(TestProcedureStepUpdateSchema).optional()
});

// GET /api/admin/test-procedures/[templateId] - Get a specific test procedure template
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
    
    if (!checkUserRole(user, ['ADMIN', 'QC_PERSON', 'PRODUCTION_COORDINATOR', 'ASSEMBLER'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const template = await prisma.testProcedureTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        },
        orderTestResults: {
          select: {
            id: true,
            orderId: true,
            buildNumber: true,
            overallStatus: true,
            testedBy: {
              select: {
                fullName: true,
                initials: true
              }
            },
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 test results
        },
        _count: {
          select: { orderTestResults: true }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Test procedure template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching test procedure template:', error);
    return NextResponse.json({ error: 'Failed to fetch test procedure template' }, { status: 500 });
  }
}

// PUT /api/admin/test-procedures/[templateId] - Update a test procedure template
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
    
    if (!checkUserRole(user, ['ADMIN', 'QC_PERSON'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = TestProcedureUpdateSchema.parse(body);

    // Check if template exists
    const existingTemplate = await prisma.testProcedureTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: true
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Test procedure template not found' }, { status: 404 });
    }

    const template = await prisma.$transaction(async (tx) => {
      // Update the test procedure template
      const updatedTemplate = await tx.testProcedureTemplate.update({
        where: { id: templateId },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          version: validatedData.version,
          productFamily: validatedData.productFamily,
          isActive: validatedData.isActive,
          estimatedDurationMinutes: validatedData.estimatedDurationMinutes
        }
      });

      // Handle steps updates if provided
      if (validatedData.steps) {
        // Delete all existing steps
        await tx.testProcedureStepTemplate.deleteMany({
          where: { testProcedureTemplateId: templateId }
        });

        // Create new steps
        for (const step of validatedData.steps) {
          await tx.testProcedureStepTemplate.create({
            data: {
              testProcedureTemplateId: templateId,
              stepNumber: step.stepNumber,
              title: step.title,
              instruction: step.instruction,
              expectedOutcome: step.expectedOutcome,
              inputDataType: step.inputDataType,
              numericUnit: step.numericUnit,
              numericLowerLimit: step.numericLowerLimit,
              numericUpperLimit: step.numericUpperLimit,
              options: step.options || undefined,
              isRequired: step.isRequired,
              repeatPerInstance: step.repeatPerInstance,
              linkedCalibrationEquipmentTypeId: step.linkedCalibrationEquipmentTypeId
            }
          });
        }
      }

      // Return the updated template with all relations
      return await tx.testProcedureTemplate.findUnique({
        where: { id: templateId },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' }
          }
        }
      });
    });

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating test procedure template:', error);
    return NextResponse.json({ error: 'Failed to update test procedure template' }, { status: 500 });
  }
}

// DELETE /api/admin/test-procedures/[templateId] - Delete a test procedure template
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

    // Check if template exists and has been used
    const template = await prisma.testProcedureTemplate.findUnique({
      where: { id: templateId },
      include: {
        orderTestResults: true
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Test procedure template not found' }, { status: 404 });
    }

    // Check if template has been used to create test results
    if (template.orderTestResults.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete test procedure template that has been used for testing. Consider deactivating it instead.' 
      }, { status: 400 });
    }

    // Delete template and all related data (cascade should handle this)
    await prisma.testProcedureTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting test procedure template:', error);
    return NextResponse.json({ error: 'Failed to delete test procedure template' }, { status: 500 });
  }
}