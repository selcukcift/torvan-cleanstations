import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { getOrderSingleSourceOfTruth } from '@/lib/orderSingleSourceOfTruth';
import { PreQCTemplateGenerator, type OrderConfiguration } from '@/lib/preQcTemplateGenerator';
import fs from 'fs';
import path from 'path';

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
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (!checkUserRole(user, ['ASSEMBLER', 'QC_PERSON', 'PRODUCTION_COORDINATOR', 'ADMIN'])) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let productFamily = searchParams.get('productFamily');
    const formType = searchParams.get('formType'); // Get the form type parameter

    // If productFamily not provided, try to determine from order
    if (!productFamily) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          basinConfigurations: true
        }
      });

      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      // Determine product family based on order details
      // For now, we'll assume T2 if not specified
      // In a real implementation, this would be determined from the order configuration
      productFamily = 'MDRD_T2_SINK';
    }

    // Build where clause for template search
    let whereClause: any = {
      isActive: true
    };

    // Enhanced form type matching for our comprehensive templates
    if (formType) {
      // Map form types to template names
      const templateNameMap: { [key: string]: string } = {
        'Pre-Production Check': 'Pre-Production Check',
        'Final QC': 'Final Quality Check',
        'Production Check': 'Production Check',
        'Basin Production Check': 'Basin Production Check',
        'Packaging Verification': 'Packaging Verification',
        'End-of-Line Testing': 'End-of-Line Testing'
      };
      
      const templateName = templateNameMap[formType] || formType;
      
      // When searching by specific template name, search for exact match first
      // then fall back to product family specific templates
      whereClause = {
        isActive: true,
        AND: [
          { name: templateName },
          {
            OR: [
              { appliesToProductFamily: null }, // Generic template
              { appliesToProductFamily: productFamily } // Product-specific template
            ]
          }
        ]
      };
    } else {
      // No form type specified, search by product family only
      whereClause = {
        isActive: true,
        OR: [
          { appliesToProductFamily: productFamily },
          { appliesToProductFamily: null } // Generic template as fallback
        ]
      };
    }

    // Log for debugging
    console.log('QC Template search:', {
      formType,
      productFamily,
      whereClause: JSON.stringify(whereClause)
    });

    // Find active template for product family and form type
    const template = await prisma.qcFormTemplate.findFirst({
      where: whereClause,
      include: {
        items: { 
          orderBy: { order: 'asc' } 
        }
      },
      orderBy: [
        { appliesToProductFamily: 'desc' }, // Prefer specific over generic
        { createdAt: 'desc' } // Most recent first
      ]
    });

    if (!template) {
      return NextResponse.json({ 
        success: false,
        error: `No active QC template found for product family ${productFamily}${formType ? ` and form type "${formType}"` : ''}`,
        productFamily,
        formType 
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

    // Initialize orderConfig variable outside the conditional block
    let orderConfig = null;

    // If this is a Pre-Production Check, use dynamic template generation
    if (formType === 'Pre-Production Check') {
      try {
        // Get the single source of truth for this order
        try {
          orderConfig = await getOrderSingleSourceOfTruth(orderId);
        } catch (err) {
          // If single source of truth doesn't exist, try to load from file directly
          const filePath = path.join(
            process.cwd(),
            'orders',
            'single-source-of-truth',
            `order-${orderId}-source-of-truth.json`
          );
          
          if (fs.existsSync(filePath)) {
            orderConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } else {
            console.warn('Single source of truth not found for order:', orderId);
            // Return the static template if no configuration available
            return NextResponse.json({ 
              success: true,
              template,
              existingResult,
              productFamily,
              orderConfiguration: null,
              message: 'Using static template - no configuration found'
            });
          }
        }

        if (orderConfig && orderConfig.configuration) {
          // Use intelligent template generation instead of database template
          const generator = new PreQCTemplateGenerator(orderConfig.configuration as OrderConfiguration);
          const dynamicItems = generator.generateChecklist();
          
          // Create or update dynamic template items in the database for this order
          const dynamicTemplateId = `${template.id}-dynamic-${orderId}`;
          
          // Create a dynamic template in the database
          const dynamicTemplate = await prisma.$transaction(async (tx) => {
            // Delete existing dynamic template for this order if it exists
            const existingDynamic = await tx.qcFormTemplate.findFirst({
              where: { 
                name: `Pre-Production Check - Dynamic ${orderId}`,
                appliesToProductFamily: 'MDRD_T2_SINK'
              },
              include: { items: true }
            });
            
            if (existingDynamic) {
              await tx.qcFormTemplateItem.deleteMany({
                where: { templateId: existingDynamic.id }
              });
              await tx.qcFormTemplate.delete({
                where: { id: existingDynamic.id }
              });
            }
            
            // Create new dynamic template
            const newTemplate = await tx.qcFormTemplate.create({
              data: {
                name: `Pre-Production Check - Dynamic ${orderId}`,
                description: 'Intelligent Pre-Production Quality Control Checklist',
                appliesToProductFamily: 'MDRD_T2_SINK',
                isActive: true,
                items: {
                  create: dynamicItems.map(item => ({
                    section: item.section,
                    checklistItem: item.checklistItem,
                    itemType: item.itemType,
                    isRequired: item.isRequired,
                    order: item.order,
                    options: item.options ? JSON.stringify(item.options) : null,
                    applicabilityCondition: null,
                    repeatPer: null,
                    notesPrompt: null,
                    expectedValue: null
                  }))
                }
              },
              include: {
                items: { orderBy: { order: 'asc' } }
              }
            });
            
            return newTemplate;
          });
          
          // Replace the original template with the dynamic one
          template.id = dynamicTemplate.id;
          template.name = dynamicTemplate.name;
          template.description = dynamicTemplate.description;
          template.items = dynamicTemplate.items;
          
          console.log(`Generated ${dynamicItems.length} intelligent checklist items for Pre-Production Check`);
        }
      } catch (error) {
        console.error('Error generating dynamic Pre-QC template:', error);
        // Fall back to database template if generation fails
      }
    }

    return NextResponse.json({ 
      success: true,
      template,
      existingResult,
      productFamily,
      orderConfiguration: orderConfig // Include configuration data for verification
    });
  } catch (error) {
    console.error('Error fetching QC template:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch QC template' }, { status: 500 });
  }
}

// Helper function to process template items based on order configuration
async function processTemplateItems(items: any[], orderConfig: any) {
  const processedItems: any[] = [];
  const configuration = orderConfig.configuration || {};
  
  for (const item of items) {
    // Check applicability condition
    if (item.applicabilityCondition) {
      try {
        // Create a safe evaluation context
        const evalContext = {
          configuration: configuration,
          basins: configuration.basins || [],
          structuralComponents: configuration.structuralComponents || {},
          pegboard: configuration.pegboard || false
        };
        
        // Evaluate the condition safely
        const conditionMet = evaluateCondition(item.applicabilityCondition, evalContext);
        
        if (!conditionMet) {
          continue; // Skip this item if condition is not met
        }
      } catch (error) {
        console.error(`Error evaluating condition for item ${item.id}:`, error);
        // Include the item if we can't evaluate the condition
      }
    }
    
    // Handle repeatPer logic
    if (item.repeatPer === 'basin' && configuration.basins) {
      // Create separate items for each basin
      configuration.basins.forEach((basin: any, index: number) => {
        const basinNumber = index + 1;
        processedItems.push({
          ...item,
          section: `Basin ${basinNumber}`,
          checklistItem: item.checklistItem.replace('Basin 1', `Basin ${basinNumber}`),
          // Add a unique identifier for repeated items
          repeatIndex: basinNumber,
          originalId: item.id
        });
      });
    } else {
      // Include the item as-is
      processedItems.push(item);
    }
  }
  
  // Sort by order
  return processedItems.sort((a, b) => a.order - b.order);
}

// Safe condition evaluator
function evaluateCondition(condition: string, context: any): boolean {
  try {
    // Replace property access with safe navigation
    let safeCondition = condition;
    
    // Handle common patterns
    if (condition.includes('configuration.basins.length')) {
      const basinCount = context.basins?.length || 0;
      return evaluateExpression(condition, 'configuration.basins.length', basinCount);
    }
    
    if (condition.includes('configuration.pegboard')) {
      return context.pegboard === true;
    }
    
    if (condition.includes('configuration.structuralComponents.feet.type')) {
      const feetType = context.structuralComponents?.feet?.type || '';
      return condition.includes(feetType);
    }
    
    if (condition.includes('configuration.structuralComponents.legs.typeId')) {
      const legsTypeId = context.structuralComponents?.legs?.typeId || '';
      if (condition.includes('!') && condition.includes('includes("-FH-")')) {
        // Check for height-adjustable legs (no -FH- in typeId)
        return legsTypeId && !legsTypeId.includes('-FH-');
      }
      return condition.includes(legsTypeId);
    }
    
    // Default to true if we can't evaluate
    return true;
  } catch (error) {
    console.error('Error in condition evaluation:', error);
    return true;
  }
}

// Helper to evaluate numeric expressions
function evaluateExpression(condition: string, variable: string, value: number): boolean {
  if (condition.includes('>=')) {
    const parts = condition.split('>=');
    const threshold = parseInt(parts[1].trim());
    return value >= threshold;
  }
  
  if (condition.includes('===')) {
    const parts = condition.split('===');
    const expected = parseInt(parts[1].trim());
    return value === expected;
  }
  
  return true;
}