import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/admin/qc-templates/[templateId]/usage - Check template usage
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

    // Get template basic info
    const template = await prisma.qcFormTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get usage statistics
    const usageStats = await prisma.orderQcResult.findMany({
      where: { qcFormTemplateId: templateId },
      select: {
        id: true,
        qcTimestamp: true,
        overallStatus: true,
        order: {
          select: {
            id: true,
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        },
        qcPerformedBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      },
      orderBy: { qcTimestamp: 'desc' },
      take: 50 // Limit to 50 most recent uses
    });

    // Get summary counts
    const totalUsage = await prisma.orderQcResult.count({
      where: { qcFormTemplateId: templateId }
    });

    const statusCounts = await prisma.orderQcResult.groupBy({
      by: ['overallStatus'],
      where: { qcFormTemplateId: templateId },
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      template,
      usage: {
        total: totalUsage,
        recentResults: usageStats,
        statusBreakdown: statusCounts.reduce((acc, curr) => {
          acc[curr.overallStatus] = curr._count.id;
          return acc;
        }, {} as Record<string, number>)
      },
      canModify: totalUsage === 0,
      message: totalUsage > 0 
        ? `This template has been used ${totalUsage} times. Modifications will create a new version.`
        : 'This template has not been used yet and can be modified directly.'
    });
  } catch (error) {
    console.error('Error fetching template usage:', error);
    return NextResponse.json({ error: 'Failed to fetch template usage' }, { status: 500 });
  }
}