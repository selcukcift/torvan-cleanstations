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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if template exists
    const template = await prisma.qcFormTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get total usage count
    const totalUsage = await prisma.orderQcResult.count({
      where: { 
        qcFormTemplateId: templateId,
        overallStatus: { not: 'PENDING' }
      }
    });

    // Get monthly usage data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyUsage = await prisma.orderQcResult.groupBy({
      by: ['qcTimestamp'],
      where: {
        qcFormTemplateId: templateId,
        overallStatus: { not: 'PENDING' },
        qcTimestamp: { gte: sixMonthsAgo }
      },
      _count: { id: true }
    });

    // Process monthly data
    const monthlyData = monthlyUsage.map(item => ({
      month: item.qcTimestamp.toISOString().substring(0, 7), // YYYY-MM
      count: item._count.id
    }));

    // Get status breakdown
    const statusBreakdown = await prisma.orderQcResult.groupBy({
      by: ['overallStatus'],
      where: {
        qcFormTemplateId: templateId,
        overallStatus: { not: 'PENDING' }
      },
      _count: { id: true }
    });

    const statusData = statusBreakdown.map(item => ({
      status: item.overallStatus,
      count: item._count.id
    }));

    // Get recent QC results
    const recentResults = await prisma.orderQcResult.findMany({
      where: {
        qcFormTemplateId: templateId,
        overallStatus: { not: 'PENDING' }
      },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true
          }
        },
        qcPerformedBy: {
          select: {
            username: true
          }
        }
      },
      orderBy: { qcTimestamp: 'desc' },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        totalUsage,
        monthlyUsage: monthlyData,
        statusBreakdown: statusData,
        recentResults: recentResults.map(result => ({
          id: result.id,
          orderNumber: result.order.poNumber,
          customerName: result.order.customerName,
          status: result.overallStatus,
          completedAt: result.qcTimestamp,
          completedBy: result.qcPerformedBy?.username
        })),
        canModify: totalUsage === 0,
        message: totalUsage > 0 
          ? `This template has been used ${totalUsage} times. Modifications will create a new version.`
          : 'This template has not been used yet and can be modified directly.'
      }
    });
  } catch (error) {
    console.error('Error fetching template usage:', error);
    return NextResponse.json({ error: 'Failed to fetch template usage' }, { status: 500 });
  }
}