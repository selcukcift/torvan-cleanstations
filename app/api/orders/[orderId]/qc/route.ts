import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for QC result submission
const QcResultSubmissionSchema = z.object({
  templateId: z.string(),
  overallStatus: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'REQUIRES_REVIEW']),
  notes: z.string().optional(),
  itemResults: z.array(z.object({
    templateItemId: z.string(),
    resultValue: z.string().optional().nullable(),
    isConformant: z.boolean().optional().nullable(),
    notes: z.string().optional().nullable()
  }))
});

// GET /api/orders/[orderId]/qc - Get existing QC result for this order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!checkUserRole(user, ['ASSEMBLER', 'QC_PERSON', 'PRODUCTION_COORDINATOR', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get existing QC result for this order
    const qcResult = await prisma.orderQcResult.findFirst({
      where: { orderId: orderId },
      include: {
        qcFormTemplate: {
          include: { 
            items: { 
              orderBy: { order: 'asc' } 
            } 
          }
        },
        itemResults: {
          include: {
            qcFormTemplateItem: true
          }
        },
        qcPerformedBy: {
          select: { 
            id: true, 
            fullName: true,
            initials: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({ qcResult });
  } catch (error) {
    console.error('Error fetching QC result:', error);
    return NextResponse.json({ error: 'Failed to fetch QC result' }, { status: 500 });
  }
}

// POST /api/orders/[orderId]/qc - Create or update QC result
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!checkUserRole(user, ['ASSEMBLER', 'QC_PERSON'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = QcResultSubmissionSchema.parse(body);

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify template exists and is active
    const template = await prisma.qcFormTemplate.findUnique({
      where: { id: validatedData.templateId }
    });

    if (!template || !template.isActive) {
      return NextResponse.json({ error: 'QC template not found or inactive' }, { status: 404 });
    }

    // Create or update QC result in a transaction
    const qcResult = await prisma.$transaction(async (tx) => {
      // Upsert QC result
      const result = await tx.orderQcResult.upsert({
        where: {
          orderId_qcFormTemplateId: {
            orderId: orderId,
            qcFormTemplateId: validatedData.templateId
          }
        },
        update: {
          overallStatus: validatedData.overallStatus,
          notes: validatedData.notes,
          qcTimestamp: new Date(),
          qcPerformedById: user.id
        },
        create: {
          orderId: orderId,
          qcFormTemplateId: validatedData.templateId,
          qcPerformedById: user.id,
          overallStatus: validatedData.overallStatus,
          notes: validatedData.notes
        }
      });

      // Delete existing item results
      await tx.orderQcItemResult.deleteMany({
        where: { orderQcResultId: result.id }
      });

      // Create new item results
      if (validatedData.itemResults.length > 0) {
        await tx.orderQcItemResult.createMany({
          data: validatedData.itemResults.map(item => ({
            orderQcResultId: result.id,
            qcFormTemplateItemId: item.templateItemId,
            resultValue: item.resultValue,
            isConformant: item.isConformant,
            notes: item.notes
          }))
        });
      }

      // Update order status if QC is complete
      if (validatedData.overallStatus === 'PASSED') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: 'TESTING_COMPLETE'
          }
        });

        // Log the status change
        await tx.orderHistoryLog.create({
          data: {
            orderId: orderId,
            userId: user.id,
            action: 'QC_COMPLETED',
            oldStatus: order.orderStatus,
            newStatus: 'TESTING_COMPLETE',
            notes: `QC completed with status: ${validatedData.overallStatus}`
          }
        });
      }

      // Return the complete result
      return await tx.orderQcResult.findUnique({
        where: { id: result.id },
        include: {
          qcFormTemplate: {
            include: { items: true }
          },
          itemResults: {
            include: {
              qcFormTemplateItem: true
            }
          },
          qcPerformedBy: {
            select: { 
              id: true, 
              fullName: true,
              initials: true,
              role: true
            }
          }
        }
      });
    });

    return NextResponse.json({ qcResult }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error saving QC result:', error);
    return NextResponse.json({ error: 'Failed to save QC result' }, { status: 500 });
  }
}