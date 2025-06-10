import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for TestProcedureStepTemplate
const TestProcedureStepSchema = z.object({
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

// Validation schema for creating TestProcedureTemplate
const TestProcedureCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional().nullable(),
  version: z.string().default('1.0'),
  productFamily: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  estimatedDurationMinutes: z.number().int().positive().optional().nullable(),
  steps: z.array(TestProcedureStepSchema).min(1, 'At least one step is required')
});

// Validation schema for updating TestProcedureTemplate
const TestProcedureUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  version: z.string().optional(),
  productFamily: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional().nullable(),
  steps: z.array(TestProcedureStepSchema).optional()
});

// GET /api/admin/test-procedures - List all test procedure templates
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!checkUserRole(user, ['ADMIN', 'QC_PERSON', 'PRODUCTION_COORDINATOR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const productFamily = searchParams.get('productFamily');

    // Build where clause
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (productFamily) {
      where.productFamily = productFamily;
    }

    const templates = await prisma.testProcedureTemplate.findMany({
      where,
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        },
        _count: {
          select: { orderTestResults: true }
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
          productFamily: template.productFamily,
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

    // Sort versions within each group
    Object.values(templateGroups).forEach((group: any) => {
      group.versions.sort((a: any, b: any) => {
        const aVersionParts = a.version.split('.').map((p: string) => parseInt(p) || 0);
        const bVersionParts = b.version.split('.').map((p: string) => parseInt(p) || 0);
        
        for (let i = 0; i < Math.max(aVersionParts.length, bVersionParts.length); i++) {
          const aPart = aVersionParts[i] || 0;
          const bPart = bVersionParts[i] || 0;
          if (aPart !== bPart) {
            return bPart - aPart; // Descending order
          }
        }
        return 0;
      });
    });

    return NextResponse.json({ 
      templates,
      templateGroups: Object.values(templateGroups)
    });
  } catch (error) {
    console.error('Error fetching test procedure templates:', error);
    return NextResponse.json({ error: 'Failed to fetch test procedure templates' }, { status: 500 });
  }
}

// POST /api/admin/test-procedures - Create a new test procedure template
export async function POST(request: NextRequest) {
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
    const validatedData = TestProcedureCreateSchema.parse(body);

    // Check if template name already exists for this version
    const existingTemplate = await prisma.testProcedureTemplate.findFirst({
      where: {
        name: validatedData.name,
        version: validatedData.version
      }
    });

    if (existingTemplate) {
      return NextResponse.json({ 
        error: 'Test procedure template with this name and version already exists' 
      }, { status: 400 });
    }

    const template = await prisma.$transaction(async (tx) => {
      // Create the test procedure template
      const createdTemplate = await tx.testProcedureTemplate.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          version: validatedData.version,
          productFamily: validatedData.productFamily,
          isActive: validatedData.isActive,
          estimatedDurationMinutes: validatedData.estimatedDurationMinutes
        }
      });

      // Create the steps
      for (const step of validatedData.steps) {
        await tx.testProcedureStepTemplate.create({
          data: {
            testProcedureTemplateId: createdTemplate.id,
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

      // Return the complete template with all relations
      return await tx.testProcedureTemplate.findUnique({
        where: { id: createdTemplate.id },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' }
          }
        }
      });
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating test procedure template:', error);
    return NextResponse.json({ error: 'Failed to create test procedure template' }, { status: 500 });
  }
}