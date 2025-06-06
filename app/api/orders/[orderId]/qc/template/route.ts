import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/orders/[orderId]/qc/template - Find active template for product family
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
    if (!checkUserRole(user, ['ASSEMBLER', 'QC_PERSON', 'PRODUCTION_COORDINATOR', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let productFamily = searchParams.get('productFamily');

    // If productFamily not provided, try to determine from order
    if (!productFamily) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          basinConfigurations: true
        }
      });

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Determine product family based on order details
      // For now, we'll assume T2 if not specified
      // In a real implementation, this would be determined from the order configuration
      productFamily = 'MDRD_T2_SINK';
    }

    // Find active template for product family
    const template = await prisma.qcFormTemplate.findFirst({
      where: {
        isActive: true,
        OR: [
          { appliesToProductFamily: productFamily },
          { appliesToProductFamily: null } // Generic template as fallback
        ]
      },
      include: {
        items: { 
          orderBy: { order: 'asc' } 
        }
      },
      orderBy: {
        appliesToProductFamily: 'desc' // Prefer specific over generic
      }
    });

    if (!template) {
      return NextResponse.json({ 
        error: 'No active QC template found for this product family',
        productFamily 
      }, { status: 404 });
    }

    // Check if QC has already been started for this order with this template
    const existingResult = await prisma.orderQcResult.findUnique({
      where: {
        orderId_qcFormTemplateId: {
          orderId: orderId,
          qcFormTemplateId: template.id
        }
      },
      select: {
        id: true,
        overallStatus: true
      }
    });

    return NextResponse.json({ 
      template,
      existingResult,
      productFamily
    });
  } catch (error) {
    console.error('Error fetching QC template:', error);
    return NextResponse.json({ error: 'Failed to fetch QC template' }, { status: 500 });
  }
}