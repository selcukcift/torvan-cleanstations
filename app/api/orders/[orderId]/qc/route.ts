import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';
import { QcResultSubmissionSchema } from '@/lib/qcValidationSchemas';
import { notificationTriggerService } from '@/lib/notificationTriggerService';

const prisma = new PrismaClient();

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
        },
        itemResults: {
          include: {
            qcFormTemplateItem: true,
            attachedDocument: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                size: true,
                mimeType: true
              }
            }
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
          externalJobId: validatedData.externalJobId,
          qcTimestamp: new Date(),
          qcPerformedById: user.id
        },
        create: {
          orderId: orderId,
          qcFormTemplateId: validatedData.templateId,
          qcPerformedById: user.id,
          overallStatus: validatedData.overallStatus,
          notes: validatedData.notes,
          externalJobId: validatedData.externalJobId
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
            notes: item.notes,
            isNotApplicable: item.isNotApplicable || false,
            repetitionInstanceKey: item.repetitionInstanceKey,
            attachedDocumentId: item.attachedDocumentId
          }))
        });
      }

      // Update order status if QC is complete - different status based on QC phase
      if (validatedData.overallStatus === 'PASSED') {
        let newStatus: string;
        let action: string;
        
        // Determine next status based on current order status and QC template type
        if (order.orderStatus === 'ReadyForPreQC' || template.formType === 'Pre-Production Check') {
          newStatus = 'ReadyForProduction';
          action = 'PRE_QC_COMPLETED';
        } else if (order.orderStatus === 'ReadyForFinalQC' || template.formType === 'Final QC') {
          newStatus = 'ReadyForShip';
          action = 'FINAL_QC_COMPLETED';
        } else {
          // Default behavior for other QC types
          newStatus = 'TESTING_COMPLETE';
          action = 'QC_COMPLETED';
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: newStatus
          }
        });

        // Log the status change
        await tx.orderHistoryLog.create({
          data: {
            orderId: orderId,
            userId: user.id,
            action: action,
            oldStatus: order.orderStatus,
            newStatus: newStatus,
            notes: `QC completed with status: ${validatedData.overallStatus}. Template: ${template.formType}`
          }
        });

        // Trigger notifications for QC completion and status change (async, non-blocking)
        setImmediate(() => {
          // Trigger order status change notifications
          notificationTriggerService.triggerOrderStatusChange(
            orderId, 
            order.orderStatus, 
            newStatus, 
            user.id
          ).catch(error => {
            console.error('Failed to trigger order status change notifications:', error)
          })

          // Trigger assembly milestone notification for QC completion
          notificationTriggerService.sendNotificationToRoles(
            ['PRODUCTION_COORDINATOR', 'ADMIN'],
            'ASSEMBLY_MILESTONE',
            {
              orderId,
              poNumber: order.poNumber,
              customerName: order.customerName,
              buildNumber: order.buildNumbers[0],
              milestone: `${template.formType} Completed - ${validatedData.overallStatus}`
            }
          ).catch(error => {
            console.error('Failed to trigger QC milestone notification:', error)
          })
        })
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