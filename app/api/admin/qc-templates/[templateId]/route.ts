import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for updating QC templates
const QcTemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  version: z.string().optional(),
  description: z.string().optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(z.object({
    id: z.string().optional(), // Existing item ID (for updates)
    section: z.string(),
    checklistItem: z.string(),
    itemType: z.enum(['PASS_FAIL', 'TEXT_INPUT', 'NUMERIC_INPUT', 'SINGLE_SELECT', 'MULTI_SELECT', 'DATE_INPUT', 'CHECKBOX']),
    options: z.array(z.string()).optional().nullable(),
    expectedValue: z.string().optional().nullable(),
    order: z.number(),
    isRequired: z.boolean().default(true),
    _action: z.enum(['create', 'update', 'delete']).optional()
  })).optional()
});

// GET /api/admin/qc-templates/[templateId] - Get specific template with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    if (!checkUserRole(user, ['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const template = await prisma.qcFormTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { orderQcResults: true }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching QC template:', error);
    return NextResponse.json({ error: 'Failed to fetch QC template' }, { status: 500 });
  }
}

// PUT /api/admin/qc-templates/[templateId] - Update template and items (transaction-based)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    if (!checkUserRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = QcTemplateUpdateSchema.parse(body);

    // Use transaction to ensure atomicity
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // Update template basic info
      await tx.qcFormTemplate.update({
        where: { id: templateId },
        data: {
          name: validatedData.name,
          version: validatedData.version,
          description: validatedData.description,
          appliesToProductFamily: validatedData.appliesToProductFamily,
          isActive: validatedData.isActive,
          updatedAt: new Date()
        }
      });

      // Handle items if provided
      if (validatedData.items) {
        // Process items based on action
        for (const item of validatedData.items) {
          if (item._action === 'delete' && item.id) {
            // Delete existing item
            await tx.qcFormTemplateItem.delete({
              where: { id: item.id }
            });
          } else if (item._action === 'update' && item.id) {
            // Update existing item
            await tx.qcFormTemplateItem.update({
              where: { id: item.id },
              data: {
                section: item.section,
                checklistItem: item.checklistItem,
                itemType: item.itemType,
                options: item.options || undefined,
                expectedValue: item.expectedValue,
                order: item.order,
                isRequired: item.isRequired
              }
            });
          } else if (item._action === 'create' || !item.id) {
            // Create new item
            await tx.qcFormTemplateItem.create({
              data: {
                templateId: templateId,
                section: item.section,
                checklistItem: item.checklistItem,
                itemType: item.itemType,
                options: item.options || undefined,
                expectedValue: item.expectedValue,
                order: item.order,
                isRequired: item.isRequired
              }
            });
          }
        }
      }

      // Return updated template with items
      return await tx.qcFormTemplate.findUnique({
        where: { id: templateId },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating QC template:', error);
    return NextResponse.json({ error: 'Failed to update QC template' }, { status: 500 });
  }
}

// DELETE /api/admin/qc-templates/[templateId] - Delete template (cascade to items)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    if (!checkUserRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if template has been used in any QC results
    const usageCount = await prisma.orderQcResult.count({
      where: { qcFormTemplateId: templateId }
    });

    if (usageCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete template that has been used in QC results',
        usageCount 
      }, { status: 400 });
    }

    // Delete template (items will cascade delete due to schema)
    await prisma.qcFormTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting QC template:', error);
    return NextResponse.json({ error: 'Failed to delete QC template' }, { status: 500 });
  }
}