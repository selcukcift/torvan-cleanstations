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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the template to find its formName and formType
    const baseTemplate = await prisma.qcFormTemplate.findUnique({
      where: { id: templateId },
      select: { name: true, description: true }
    });

    if (!baseTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get all versions of templates with the same name
    const versions = await prisma.qcFormTemplate.findMany({
      where: {
        name: baseTemplate.name
      },
      select: {
        id: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orderQcResults: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // Process version data
    const versionData = versions.map(version => ({
      id: version.id,
      version: version.version,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
      usageCount: version._count.orderQcResults,
      isCurrent: version.id === templateId
    }));

    return NextResponse.json({
      success: true,
      data: {
        currentTemplate: {
          name: baseTemplate.name,
          description: baseTemplate.description
        },
        versions: versionData,
        totalVersions: versionData.length
      }
    });
  } catch (error) {
    console.error('Error fetching template versions:', error);
    return NextResponse.json({ error: 'Failed to fetch template versions' }, { status: 500 });
  }
}