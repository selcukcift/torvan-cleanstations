import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/orders/[orderId]/testing/templates - Get available test procedure templates for this order
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

    // Get order details to determine applicable templates
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sinkConfigurations: {
          select: {
            buildNumber: true,
            sinkModelId: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const buildNumber = searchParams.get('buildNumber');

    // Determine product family based on order configuration
    let productFamily: string | null = null;
    
    // Extract product family from sink configurations
    const sinkConfig = buildNumber 
      ? order.sinkConfigurations.find(sc => sc.buildNumber === buildNumber)
      : order.sinkConfigurations[0];
    
    if (sinkConfig) {
      // Determine product family from sink model
      if (sinkConfig.sinkModelId.includes('SINK')) {
        productFamily = 'SINK';
      } else if (sinkConfig.sinkModelId.includes('INSTRO')) {
        productFamily = 'INSTROSINK';
      } else if (sinkConfig.sinkModelId.includes('ENDO')) {
        productFamily = 'ENDOSCOPE';
      }
    }

    // Build where clause for templates
    const where: any = {
      isActive: true
    };

    // Filter by product family if determined
    if (productFamily) {
      where.OR = [
        { productFamily: productFamily },
        { productFamily: null } // Generic templates
      ];
    }

    // Get available test procedure templates
    const templates = await prisma.testProcedureTemplate.findMany({
      where,
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
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
            repeatPerInstance: true,
            linkedCalibrationEquipmentTypeId: true
          }
        },
        _count: {
          select: { orderTestResults: true }
        }
      },
      orderBy: [
        { name: 'asc' },
        { version: 'desc' }
      ]
    });

    // Get existing test results for this order to show completion status
    const existingResults = await prisma.orderTestResult.findMany({
      where: {
        orderId: orderId,
        ...(buildNumber ? { buildNumber } : {})
      },
      select: {
        testProcedureTemplateId: true,
        buildNumber: true,
        overallStatus: true,
        completedAt: true
      }
    });

    // Enhance templates with completion status
    const templatesWithStatus = templates.map(template => {
      const existingResult = existingResults.find(
        result => result.testProcedureTemplateId === template.id &&
                 (!buildNumber || result.buildNumber === buildNumber)
      );

      return {
        ...template,
        completionStatus: existingResult ? {
          status: existingResult.overallStatus,
          completedAt: existingResult.completedAt,
          buildNumber: existingResult.buildNumber
        } : null
      };
    });

    return NextResponse.json({ 
      templates: templatesWithStatus,
      order: {
        id: order.id,
        poNumber: order.poNumber,
        productFamily,
        buildNumbers: order.buildNumbers
      }
    });
  } catch (error) {
    console.error('Error fetching test procedure templates for order:', error);
    return NextResponse.json({ error: 'Failed to fetch test procedure templates' }, { status: 500 });
  }
}