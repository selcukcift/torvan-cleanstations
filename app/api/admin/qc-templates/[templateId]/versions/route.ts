import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/admin/qc-templates/[templateId]/versions - Get all versions of a template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  try {
    const user = await getAuthUser();
    if (!user || !checkUserRole(user, ['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the current template
    const currentTemplate = await prisma.qcFormTemplate.findUnique({
      where: { id: templateId },
      select: {
        name: true,
        appliesToProductFamily: true
      }
    });

    if (!currentTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Find all versions of templates with the same name and product family
    const versions = await prisma.qcFormTemplate.findMany({
      where: {
        name: currentTemplate.name,
        appliesToProductFamily: currentTemplate.appliesToProductFamily
      },
      select: {
        id: true,
        name: true,
        version: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orderQcResults: true,
            items: true
          }
        }
      },
      orderBy: [
        { version: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Sort versions properly (handle semantic versioning)
    const sortedVersions = versions.sort((a, b) => {
      const aVersionParts = a.version.split('.').map(p => parseInt(p) || 0);
      const bVersionParts = b.version.split('.').map(p => parseInt(p) || 0);
      
      for (let i = 0; i < Math.max(aVersionParts.length, bVersionParts.length); i++) {
        const aPart = aVersionParts[i] || 0;
        const bPart = bVersionParts[i] || 0;
        if (aPart !== bPart) {
          return bPart - aPart; // Descending order
        }
      }
      return 0;
    });

    return NextResponse.json({ 
      templateName: currentTemplate.name,
      productFamily: currentTemplate.appliesToProductFamily,
      versions: sortedVersions
    });
  } catch (error) {
    console.error('Error fetching template versions:', error);
    return NextResponse.json({ error: 'Failed to fetch template versions' }, { status: 500 });
  }
}