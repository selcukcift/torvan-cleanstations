import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/orders/[orderId]/qc/history - Get all QC results for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!checkUserRole(user, ['QC_PERSON', 'PRODUCTION_COORDINATOR', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all QC results for this order
    const qcResults = await prisma.orderQcResult.findMany({
      where: { orderId: orderId },
      include: {
        qcFormTemplate: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        qcPerformedBy: {
          select: { 
            id: true, 
            fullName: true,
            initials: true,
            role: true
          }
        },
        _count: {
          select: {
            itemResults: true
          }
        }
      },
      orderBy: {
        qcTimestamp: 'desc'
      }
    });

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        poNumber: true,
        buildNumbers: true,
        customerName: true,
        orderStatus: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      order,
      qcResults,
      totalResults: qcResults.length
    });
  } catch (error) {
    console.error('Error fetching QC history:', error);
    return NextResponse.json({ error: 'Failed to fetch QC history' }, { status: 500 });
  }
}