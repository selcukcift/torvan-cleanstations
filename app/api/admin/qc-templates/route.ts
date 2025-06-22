import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { QcTemplateCreateSchema } from '@/lib/qcValidationSchemas';
import { z } from 'zod';

const prisma = new PrismaClient();

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
    const where: {
      isActive?: boolean;
      appliesToProductFamily?: string;
    } = {};
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
          orderBy: { order: 'asc' },
          select: {
            id: true,
            section: true,
            checklistItem: true,
            itemType: true,
            options: true,
            expectedValue: true,
            order: true,
            isRequired: true,
            repeatPer: true,
            applicabilityCondition: true,
            relatedPartNumber: true,
            relatedAssemblyId: true,
            defaultValue: true,
            notesPrompt: true
          }
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

    // Group templates by formName and product family to show version history
    const templateGroups = templates.reduce((groups, template) => {
      const key = `${(template as any).formName}|${(template as any).appliesToProductFamily || 'generic'}`;
      if (!groups[key]) {
        groups[key] = {
          formName: (template as any).formName,
          formType: (template as any).formType,
          productFamily: (template as any).appliesToProductFamily,
          activeVersion: null,
          versions: []
        };
      }
      
      if (template.isActive) {
        groups[key].activeVersion = template;
      }
      groups[key].versions.push(template);
      
      return groups;
    }, {} as Record<string, {
      activeVersion: typeof templates[0] | null;
      versions: typeof templates;
    }>);

    // Sort versions within each group
    Object.values(templateGroups).forEach((group) => {
      group.versions.sort((a, b) => {
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
        formName: validatedData.formName,
        formType: validatedData.formType,
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
            isRequired: item.isRequired,
            repeatPer: item.repeatPer,
            applicabilityCondition: item.applicabilityCondition,
            relatedPartNumber: item.relatedPartNumber,
            relatedAssemblyId: item.relatedAssemblyId,
            defaultValue: item.defaultValue,
            notesPrompt: item.notesPrompt
          }))
        }
      },
      include: { 
        items: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            section: true,
            checklistItem: true,
            itemType: true,
            options: true,
            expectedValue: true,
            order: true,
            isRequired: true,
            repeatPer: true,
            applicabilityCondition: true,
            relatedPartNumber: true,
            relatedAssemblyId: true,
            defaultValue: true,
            notesPrompt: true
          }
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