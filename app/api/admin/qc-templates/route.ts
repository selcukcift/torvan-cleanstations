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

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const productFamily = searchParams.get('productFamily');

    // Build where clause
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (productFamily) {
      where.appliesToProductFamily = productFamily;
    }

    const templates = await prisma.qcFormTemplate.findMany({
      where,
      include: {
        items: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { orderQcResults: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Group templates by name and product family to show version history
    const templateGroups = templates.reduce((groups, template) => {
      const key = `${template.name}|${template.appliesToProductFamily || 'generic'}`;
      if (!groups[key]) {
        groups[key] = {
          name: template.name,
          productFamily: template.appliesToProductFamily,
          activeVersion: null,
          versions: []
        };
      }
      
      if (template.isActive) {
        groups[key].activeVersion = template;
      }
      groups[key].versions.push(template);
      
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