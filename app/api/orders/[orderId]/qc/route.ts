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
    
    if (!checkUserRole(user, ['ASSEMBLER', 'QC_PERSON', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'ADMIN'])) {
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

    return NextResponse.json({ 
      success: true, 
      qcResults: qcResult ? [qcResult] : [] 
    });
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
    
    if (!checkUserRole(user, ['ASSEMBLER', 'QC_PERSON', 'PRODUCTION_COORDINATOR', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Enhanced validation for our new format
    const enhancedSubmissionSchema = z.object({
      templateId: z.string(),
      overallStatus: z.enum(['PASSED', 'FAILED']),
      inspectorNotes: z.string().optional(),
      digitalSignature: z.string().optional(),
      itemResults: z.array(z.object({
        qcFormTemplateItemId: z.string(),
        resultValue: z.string().optional(),
        isConformant: z.boolean().optional(),
        notes: z.string().optional(),
        isNotApplicable: z.boolean().optional()
      }))
    });
    
    const validatedData = enhancedSubmissionSchema.parse(body);

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
          notes: validatedData.inspectorNotes,
          qcTimestamp: new Date(),
          qcPerformedById: user.id
        },
        create: {
          orderId: orderId,
          qcFormTemplateId: validatedData.templateId,
          qcPerformedById: user.id,
          overallStatus: validatedData.overallStatus,
          notes: validatedData.inspectorNotes
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
            qcFormTemplateItemId: item.qcFormTemplateItemId,
            resultValue: item.resultValue || '',
            isConformant: item.isConformant,
            notes: item.notes,
            isNotApplicable: item.isNotApplicable || false
          }))
        });
      }

      // Update order status if QC is complete - different status based on QC phase
      if (validatedData.overallStatus === 'PASSED') {
        let newStatus: string;
        let action: string;
        
        // Determine next status based on current order status and QC template name
        if (order.orderStatus === 'READY_FOR_PRE_QC' || template.name === 'Pre-Production Check') {
          newStatus = 'READY_FOR_PRODUCTION';
          action = 'PRE_QC_COMPLETED';
        } else if (order.orderStatus === 'READY_FOR_FINAL_QC' || template.name === 'Final Quality Check') {
          newStatus = 'READY_FOR_SHIP';
          action = 'FINAL_QC_COMPLETED';
        } else if (template.name === 'Production Check' || template.name === 'Basin Production Check') {
          newStatus = 'TESTING_COMPLETE';
          action = 'PRODUCTION_QC_COMPLETED';
        } else if (template.name === 'End-of-Line Testing') {
          newStatus = 'READY_FOR_FINAL_QC';
          action = 'EOL_TESTING_COMPLETED';
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
            notes: `QC completed with status: ${validatedData.overallStatus}. Template: ${template.name}. Digital Signature: ${validatedData.digitalSignature || 'System Generated'}`
          }
        });

        // Trigger notifications for QC completion and status change (async, non-blocking)
        setImmediate(async () => {
          // Trigger order status change notifications
          await notificationTriggerService.triggerOrderStatusChange(
            orderId, 
            order.orderStatus, 
            newStatus, 
            user.id
          ).catch(error => {
            console.error('Failed to trigger order status change notifications:', error)
          })

          // Trigger assembly milestone notification for QC completion
          await notificationTriggerService.sendNotificationToRoles(
            ['PRODUCTION_COORDINATOR', 'ADMIN'],
            'ASSEMBLY_MILESTONE',
            {
              orderId,
              poNumber: order.poNumber,
              customerName: order.customerName,
              buildNumber: order.buildNumbers[0],
              milestone: `${template.name} Completed - ${validatedData.overallStatus}`
            }
          ).catch(error => {
            console.error('Failed to trigger QC milestone notification:', error)
          })

          // Create a general notification for the user who performed the QC
          await prisma.notification.create({
            data: {
              message: `Your QC for order ${order.poNumber} (${template.name}) was ${validatedData.overallStatus}`,
              linkToOrder: orderId,
              type: 'QC_COMPLETION',
              recipientId: user.id,
            },
          });
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

    return NextResponse.json({ 
      success: true, 
      message: `QC inspection completed successfully with result: ${validatedData.overallStatus}`,
      qcResult 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error saving QC result:', error);
    return NextResponse.json({ error: 'Failed to save QC result' }, { status: 500 });
  }
}