import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for cloning QC templates
const QcTemplateCloneSchema = z.object({
  name: z.string().min(1),
  version: z.string().default("1.0"),
  description: z.string().optional(),
  appliesToProductFamily: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});

// POST /api/admin/qc-templates/[templateId]/clone - Clone an existing template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    if (!user || !checkUserRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = QcTemplateCloneSchema.parse(body);

    // Get the template to clone
    const sourceTemplate = await prisma.qcFormTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!sourceTemplate) {
      return NextResponse.json({ error: 'Source template not found' }, { status: 404 });
    }

    // Create the cloned template
    const clonedTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: validatedData.name,
        version: validatedData.version,
        description: validatedData.description || sourceTemplate.description,
        appliesToProductFamily: validatedData.appliesToProductFamily !== undefined 
          ? validatedData.appliesToProductFamily 
          : sourceTemplate.appliesToProductFamily,
        isActive: validatedData.isActive,
        items: {
          create: sourceTemplate.items.map(item => ({
            section: item.section,
            checklistItem: item.checklistItem,
            itemType: item.itemType,
            options: item.options || undefined,
            expectedValue: item.expectedValue,
            order: item.order,
            isRequired: item.isRequired
          }))
        }
      },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json({ 
      template: clonedTemplate,
      message: `Template cloned successfully from "${sourceTemplate.name}" v${sourceTemplate.version}`
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error cloning QC template:', error);
    return NextResponse.json({ error: 'Failed to clone QC template' }, { status: 500 });
  }
}