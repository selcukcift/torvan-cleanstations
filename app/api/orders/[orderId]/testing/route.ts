import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { z } from 'zod';
import notificationService from '@/lib/notificationService.native';

const prisma = new PrismaClient();

// Validation schema for test step result
const TestStepResultSchema = z.object({
  stepTemplateId: z.string(),
  instanceKey: z.string().optional().nullable(),
  stringValue: z.string().optional().nullable(),
  numericValue: z.number().optional().nullable(),
  passFailValue: z.boolean().optional().nullable(),
  fileUploadId: z.string().optional().nullable(),
  isConformant: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
  calibrationData: z.string().optional().nullable()
});

// Validation schema for test result submission
const TestResultSubmissionSchema = z.object({
  testProcedureTemplateId: z.string(),
  buildNumber: z.string(),
  overallStatus: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED']),
  notes: z.string().optional().nullable(),
  stepResults: z.array(TestStepResultSchema),
  digitalSignature: z.object({
    userId: z.string(),
    timestamp: z.string(),
    userName: z.string()
  }).optional()
});

// GET /api/orders/[orderId]/testing - Get existing test results for this order
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

    const { searchParams } = new URL(request.url);
    const buildNumber = searchParams.get('buildNumber');

    // Build where clause
    const where: any = { orderId };
    if (buildNumber) {
      where.buildNumber = buildNumber;
    }

    // Get existing test results for this order
    const testResults = await prisma.orderTestResult.findMany({
      where,
      include: {
        testProcedureTemplate: {
          select: {
            id: true,
            name: true,
            version: true,
            description: true,
            productFamily: true,
            estimatedDurationMinutes: true
          }
        },
        stepResults: {
          include: {
            testProcedureStepTemplate: {
              select: {
                id: true,
                stepNumber: true,
                title: true,
                instruction: true,
                expectedOutcome: true,
                inputDataType: true,
                numericUnit: true,
                numericLowerLimit: true,
                numericUpperLimit: true,
                options: true,
                isRequired: true,
                repeatPerInstance: true
              }
            },
            fileUpload: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                size: true,
                mimeType: true
              }
            }
          },
          orderBy: [
            { testProcedureStepTemplate: { stepNumber: 'asc' } },
            { instanceKey: 'asc' }
          ]
        },
        testedBy: {
          select: { 
            id: true, 
            fullName: true,
            initials: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ testResults });
  } catch (error) {
    console.error('Error fetching test results:', error);
    return NextResponse.json({ error: 'Failed to fetch test results' }, { status: 500 });
  }
}

// POST /api/orders/[orderId]/testing - Create or update test result
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
    
    if (!checkUserRole(user, ['QC_PERSON', 'ASSEMBLER'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = TestResultSubmissionSchema.parse(body);

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify test procedure template exists and is active
    const template = await prisma.testProcedureTemplate.findUnique({
      where: { id: validatedData.testProcedureTemplateId },
      include: {
        steps: true
      }
    });

    if (!template || !template.isActive) {
      return NextResponse.json({ error: 'Test procedure template not found or inactive' }, { status: 404 });
    }

    // Create or update test result in a transaction
    const testResult = await prisma.$transaction(async (tx) => {
      // Upsert test result
      const result = await tx.orderTestResult.upsert({
        where: {
          orderId_buildNumber_testProcedureTemplateId: {
            orderId: orderId,
            buildNumber: validatedData.buildNumber,
            testProcedureTemplateId: validatedData.testProcedureTemplateId
          }
        },
        update: {
          overallStatus: validatedData.overallStatus,
          notes: validatedData.notes,
          completedAt: validatedData.overallStatus === 'PASSED' || validatedData.overallStatus === 'FAILED' 
            ? new Date() 
            : null,
          testedById: user.id
        },
        create: {
          orderId: orderId,
          buildNumber: validatedData.buildNumber,
          testProcedureTemplateId: validatedData.testProcedureTemplateId,
          testedById: user.id,
          overallStatus: validatedData.overallStatus,
          notes: validatedData.notes,
          startedAt: new Date(),
          completedAt: validatedData.overallStatus === 'PASSED' || validatedData.overallStatus === 'FAILED' 
            ? new Date() 
            : null
        }
      });

      // Delete existing step results
      await tx.orderTestStepResult.deleteMany({
        where: { orderTestResultId: result.id }
      });

      // Create new step results
      if (validatedData.stepResults.length > 0) {
        await tx.orderTestStepResult.createMany({
          data: validatedData.stepResults.map(step => ({
            orderTestResultId: result.id,
            testProcedureStepTemplateId: step.stepTemplateId,
            instanceKey: step.instanceKey,
            stringValue: step.stringValue,
            numericValue: step.numericValue,
            passFailValue: step.passFailValue,
            fileUploadId: step.fileUploadId,
            isConformant: step.isConformant,
            notes: step.notes,
            calibrationData: step.calibrationData
          }))
        });
      }

      // Update order status if testing is complete
      if (validatedData.overallStatus === 'PASSED') {
        // Check if this was the final testing step for this order
        const orderStatus = order.orderStatus;
        let newStatus: string | null = null;
        let action: string | null = null;

        if (orderStatus === 'ReadyForTesting' || orderStatus === 'TESTING_IN_PROGRESS') {
          newStatus = 'TESTING_COMPLETE';
          action = 'EOL_TESTING_COMPLETED';
        }

        if (newStatus && action) {
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
              oldStatus: orderStatus,
              newStatus: newStatus,
              notes: `EOL testing completed with status: ${validatedData.overallStatus}. Build: ${validatedData.buildNumber}`
            }
          });

          // Create notifications (async, non-blocking)
          setImmediate(() => {
            // Notify order creator
            notificationService.createNotification({
              userId: order.createdById,
              message: `Order ${order.poNumber} EOL testing completed - Build ${validatedData.buildNumber}`,
              type: 'TESTING_COMPLETED',
              orderId: order.id
            }).catch(error => {
              console.error('Failed to create notification for order creator:', error);
            });

            // Notify relevant users
            const roleNotifications: Record<string, string[]> = {
              'TESTING_COMPLETE': ['PRODUCTION_COORDINATOR', 'QC_PERSON']
            };

            const rolesToNotify = roleNotifications[newStatus];
            if (rolesToNotify) {
              prisma.user.findMany({
                where: {
                  role: { in: rolesToNotify },
                  isActive: true
                },
                select: { id: true }
              }).then(users => {
                const userIds = users.map(u => u.id);
                if (userIds.length > 0) {
                  notificationService.createBulkNotifications(userIds, {
                    message: `Order ${order.poNumber} EOL testing completed - ${template.name}`,
                    type: 'TESTING_COMPLETED',
                    orderId: order.id
                  }).catch(error => {
                    console.error('Failed to create bulk notifications:', error);
                  });
                }
              }).catch(error => {
                console.error('Failed to find users for testing notifications:', error);
              });
            }
          });
        }
      }

      // Return the complete result
      return await tx.orderTestResult.findUnique({
        where: { id: result.id },
        include: {
          testProcedureTemplate: {
            include: { steps: true }
          },
          stepResults: {
            include: {
              testProcedureStepTemplate: true,
              fileUpload: {
                select: {
                  id: true,
                  filename: true,
                  originalName: true,
                  size: true,
                  mimeType: true
                }
              }
            },
            orderBy: [
              { testProcedureStepTemplate: { stepNumber: 'asc' } },
              { instanceKey: 'asc' }
            ]
          },
          testedBy: {
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

    return NextResponse.json({ testResult }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error saving test result:', error);
    return NextResponse.json({ error: 'Failed to save test result' }, { status: 500 });
  }
}