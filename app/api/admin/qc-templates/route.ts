import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for creating/updating QC templates
const QcTemplateCreateSchema = z.object({
  name: z.string().min(1),
  version: z.string().default("1.0"),
  description: z.string().optional(),
  appliesToProductFamily: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  items: z.array(z.object({
    section: z.string(),
    checklistItem: z.string(),
    itemType: z.enum(['PASS_FAIL', 'TEXT_INPUT', 'NUMERIC_INPUT', 'SINGLE_SELECT', 'MULTI_SELECT', 'DATE_INPUT', 'CHECKBOX']),
    options: z.array(z.string()).optional().nullable(),
    expectedValue: z.string().optional().nullable(),
    order: z.number(),
    isRequired: z.boolean().default(true)
  }))
});

// GET /api/admin/qc-templates - List all QC templates
export async function GET(request: NextRequest) {
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

    const templates = await prisma.qcFormTemplate.findMany({
      include: {
        items: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { orderQcResults: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching QC templates:', error);
    return NextResponse.json({ error: 'Failed to fetch QC templates' }, { status: 500 });
  }
}

// POST /api/admin/qc-templates - Create a new QC template
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = QcTemplateCreateSchema.parse(body);

    const template = await prisma.qcFormTemplate.create({
      data: {
        name: validatedData.name,
        version: validatedData.version,
        description: validatedData.description,
        appliesToProductFamily: validatedData.appliesToProductFamily,
        isActive: validatedData.isActive,
        items: {
          create: validatedData.items.map(item => ({
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

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating QC template:', error);
    return NextResponse.json({ error: 'Failed to create QC template' }, { status: 500 });
  }
}