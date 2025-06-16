const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createQCTemplates() {
  try {
    console.log('Creating QC Form Templates...');

    // Create Pre-Production Check template
    const preProductionTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Pre-Production Check',
        description: 'Quality check performed before production begins to verify parts and documentation',
        version: '1.0',
        isActive: true,
        appliesToProductFamily: null, // Generic template for all product families
        items: {
          create: [
            {
              section: 'Documentation',
              checklistItem: 'Order documentation complete',
              itemType: 'CHECKBOX',
              order: 1,
              isRequired: true,
              notesPrompt: 'Any documentation issues?'
            },
            {
              section: 'Documentation',
              checklistItem: 'Build sheet available',
              itemType: 'CHECKBOX',
              order: 2,
              isRequired: true
            },
            {
              section: 'Parts Verification',
              checklistItem: 'All parts received',
              itemType: 'CHECKBOX',
              order: 3,
              isRequired: true,
              notesPrompt: 'List any missing parts'
            },
            {
              section: 'Parts Verification',
              checklistItem: 'Parts match order specifications',
              itemType: 'CHECKBOX',
              order: 4,
              isRequired: true
            },
            {
              section: 'Parts Verification',
              checklistItem: 'Number of parts received',
              itemType: 'NUMERIC_INPUT',
              order: 5,
              isRequired: true
            },
            {
              section: 'Quality Check',
              checklistItem: 'Parts quality acceptable',
              itemType: 'CHECKBOX',
              order: 6,
              isRequired: true,
              notesPrompt: 'Note any quality issues'
            },
            {
              section: 'Quality Check',
              checklistItem: 'No visible damage',
              itemType: 'CHECKBOX',
              order: 7,
              isRequired: true
            },
            {
              section: 'Readiness',
              checklistItem: 'Workspace prepared',
              itemType: 'CHECKBOX',
              order: 8,
              isRequired: true
            },
            {
              section: 'Readiness',
              checklistItem: 'Tools available',
              itemType: 'CHECKBOX',
              order: 9,
              isRequired: true
            },
            {
              section: 'Readiness',
              checklistItem: 'Ready for production',
              itemType: 'PASS_FAIL',
              order: 10,
              isRequired: true,
              notesPrompt: 'Explain if not ready'
            }
          ]
        }
      }
    });

    console.log('Created Pre-Production Check template:', preProductionTemplate.id);

    // Create Final QC template
    const finalQCTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Final Quality Check',
        description: 'Final quality control inspection before shipping',
        version: '1.0',
        isActive: true,
        appliesToProductFamily: null, // Generic template
        items: {
          create: [
            {
              section: 'Visual Inspection',
              checklistItem: 'Overall appearance',
              itemType: 'PASS_FAIL',
              order: 1,
              isRequired: true,
              notesPrompt: 'Note any cosmetic issues'
            },
            {
              section: 'Visual Inspection',
              checklistItem: 'No scratches or dents',
              itemType: 'CHECKBOX',
              order: 2,
              isRequired: true
            },
            {
              section: 'Visual Inspection',
              checklistItem: 'Finish quality',
              itemType: 'PASS_FAIL',
              order: 3,
              isRequired: true
            },
            {
              section: 'Dimensional Check',
              checklistItem: 'Width measurement (inches)',
              itemType: 'NUMERIC_INPUT',
              order: 4,
              isRequired: true
            },
            {
              section: 'Dimensional Check',
              checklistItem: 'Length measurement (inches)',
              itemType: 'NUMERIC_INPUT',
              order: 5,
              isRequired: true
            },
            {
              section: 'Dimensional Check',
              checklistItem: 'Dimensions match specifications',
              itemType: 'CHECKBOX',
              order: 6,
              isRequired: true
            },
            {
              section: 'Functional Test',
              checklistItem: 'All components installed',
              itemType: 'CHECKBOX',
              order: 7,
              isRequired: true
            },
            {
              section: 'Functional Test',
              checklistItem: 'Faucet operation',
              itemType: 'PASS_FAIL',
              order: 8,
              isRequired: true
            },
            {
              section: 'Functional Test',
              checklistItem: 'Drainage test',
              itemType: 'PASS_FAIL',
              order: 9,
              isRequired: true
            },
            {
              section: 'Packaging',
              checklistItem: 'Product cleaned',
              itemType: 'CHECKBOX',
              order: 10,
              isRequired: true
            },
            {
              section: 'Packaging',
              checklistItem: 'Accessories included',
              itemType: 'CHECKBOX',
              order: 11,
              isRequired: true
            },
            {
              section: 'Packaging',
              checklistItem: 'Documentation included',
              itemType: 'CHECKBOX',
              order: 12,
              isRequired: true
            },
            {
              section: 'Final Approval',
              checklistItem: 'Ready to ship',
              itemType: 'PASS_FAIL',
              order: 13,
              isRequired: true,
              notesPrompt: 'Any concerns before shipping?'
            }
          ]
        }
      }
    });

    console.log('Created Final QC template:', finalQCTemplate.id);
    console.log('QC templates created successfully!');

  } catch (error) {
    console.error('Error creating QC templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createQCTemplates();