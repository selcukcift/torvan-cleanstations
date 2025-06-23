const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPreProductionCheckTemplate() {
  console.log('🌱 Seeding Pre-Production Check template...');

  try {
    // Check if template already exists
    const existingTemplate = await prisma.qcFormTemplate.findFirst({
      where: {
        name: 'Pre-Production Check',
        appliesToProductFamily: 'MDRD_T2_SINK'
      }
    });

    if (existingTemplate) {
      console.log('⚠️  Pre-Production Check template already exists, skipping...');
      return;
    }

    // Create Pre-Production Check template
    const template = await prisma.qcFormTemplate.create({
      data: {
        name: 'Pre-Production Check',
        version: '1.0',
        description: 'Pre-production checklist for T2 sink production based on Section 1 requirements',
        isActive: true,
        appliesToProductFamily: 'MDRD_T2_SINK',
        items: {
          create: [
            // Job Information Section
            {
              section: 'Job Information',
              checklistItem: 'Job ID Number',
              itemType: 'TEXT_INPUT',
              order: 1,
              isRequired: true,
              notesPrompt: 'Enter the Job ID number'
            },
            {
              section: 'Job Information',
              checklistItem: 'Number of Basins',
              itemType: 'NUMERIC_INPUT',
              order: 2,
              isRequired: true,
              notesPrompt: 'Enter the total number of basins'
            },

            // Dimensions and Documentation
            {
              section: 'Dimensions & Documentation',
              checklistItem: 'Check Final Sink Dimensions, basin dimensions, & BOM',
              itemType: 'CHECKBOX',
              order: 10,
              isRequired: true,
              notesPrompt: 'Check dimensions of the entire sink, each basin, and any other dimension mentioned on the drawing'
            },
            {
              section: 'Dimensions & Documentation',
              checklistItem: 'Attach the final approved drawing and paperwork',
              itemType: 'CHECKBOX',
              order: 11,
              isRequired: true
            },

            // Pegboard (conditional)
            {
              section: 'Structural Components',
              checklistItem: 'Pegboard installed – dimensions match drawing',
              itemType: 'CHECKBOX',
              order: 20,
              isRequired: false,
              applicabilityCondition: 'configuration.pegboard === true',
              notesPrompt: 'Verify pegboard dimensions match the drawing'
            },

            // Sink Features
            {
              section: 'Sink Features',
              checklistItem: 'Location of sink faucet holes and mounting holes match drawing/customer order requirements',
              itemType: 'CHECKBOX',
              order: 30,
              isRequired: true
            },

            // Castors vs Feet (conditional)
            {
              section: 'Structural Components',
              checklistItem: 'Lock & levelling castors installed',
              itemType: 'CHECKBOX',
              order: 40,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.feet.type === "LEVELING_CASTERS"'
            },
            {
              section: 'Structural Components',
              checklistItem: 'Levelling Feet installed',
              itemType: 'CHECKBOX',
              order: 41,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.feet.type === "LEVELING_FEET"'
            },

            // Basin 1 Items (always present)
            {
              section: 'Basin 1',
              checklistItem: 'Basin 1 Verified',
              itemType: 'CHECKBOX',
              order: 50,
              isRequired: true,
              repeatPer: 'basin',
              notesPrompt: 'Check Basin 1'
            },
            {
              section: 'Basin 1',
              checklistItem: 'Bottom fill hole',
              itemType: 'CHECKBOX',
              order: 51,
              isRequired: true,
              repeatPer: 'basin'
            },
            {
              section: 'Basin 1',
              checklistItem: 'Drain Button',
              itemType: 'CHECKBOX',
              order: 52,
              isRequired: true,
              repeatPer: 'basin'
            },
            {
              section: 'Basin 1',
              checklistItem: 'Basin Light',
              itemType: 'CHECKBOX',
              order: 53,
              isRequired: true,
              repeatPer: 'basin'
            },
            {
              section: 'Basin 1',
              checklistItem: 'Drain Location',
              itemType: 'SINGLE_SELECT',
              order: 54,
              isRequired: true,
              options: JSON.stringify(['Center', 'Other']),
              repeatPer: 'basin',
              notesPrompt: 'If Other, please specify location'
            },

            // Basin 2 Items (conditional)
            {
              section: 'Basin 2',
              checklistItem: 'Basin 2 Verified',
              itemType: 'CHECKBOX',
              order: 60,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 2',
              notesPrompt: 'Check Basin 2 (N/A if not present)'
            },
            {
              section: 'Basin 2',
              checklistItem: 'Bottom fill hole',
              itemType: 'CHECKBOX',
              order: 61,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 2'
            },
            {
              section: 'Basin 2',
              checklistItem: 'Drain Button',
              itemType: 'CHECKBOX',
              order: 62,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 2'
            },
            {
              section: 'Basin 2',
              checklistItem: 'Basin Light',
              itemType: 'CHECKBOX',
              order: 63,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 2'
            },
            {
              section: 'Basin 2',
              checklistItem: 'Drain Location',
              itemType: 'SINGLE_SELECT',
              order: 64,
              isRequired: false,
              options: JSON.stringify(['Center', 'Other']),
              applicabilityCondition: 'configuration.basins.length >= 2',
              notesPrompt: 'If Other, please specify location'
            },

            // Basin 3 Items (conditional)
            {
              section: 'Basin 3',
              checklistItem: 'Basin 3 Verified',
              itemType: 'CHECKBOX',
              order: 70,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 3',
              notesPrompt: 'Check Basin 3 (N/A if not present)'
            },
            {
              section: 'Basin 3',
              checklistItem: 'Bottom fill hole',
              itemType: 'CHECKBOX',
              order: 71,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 3'
            },
            {
              section: 'Basin 3',
              checklistItem: 'Drain Button',
              itemType: 'CHECKBOX',
              order: 72,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 3'
            },
            {
              section: 'Basin 3',
              checklistItem: 'Basin Light',
              itemType: 'CHECKBOX',
              order: 73,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 3'
            },
            {
              section: 'Basin 3',
              checklistItem: 'Drain Location',
              itemType: 'SINGLE_SELECT',
              order: 74,
              isRequired: false,
              options: JSON.stringify(['Center', 'Other']),
              applicabilityCondition: 'configuration.basins.length >= 3',
              notesPrompt: 'If Other, please specify location'
            },

            // Sink Faucet Location (dynamic based on basin count)
            {
              section: 'Faucet Configuration',
              checklistItem: 'Sink Faucet Location - Center of basin',
              itemType: 'CHECKBOX',
              order: 80,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length === 1'
            },
            {
              section: 'Faucet Configuration',
              checklistItem: 'Sink Faucet Location - Between Basins 1/2',
              itemType: 'CHECKBOX',
              order: 81,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 2'
            },
            {
              section: 'Faucet Configuration',
              checklistItem: 'Sink Faucet Location - Between Basins 2/3',
              itemType: 'CHECKBOX',
              order: 82,
              isRequired: false,
              applicabilityCondition: 'configuration.basins.length >= 3'
            },
            {
              section: 'Faucet Configuration',
              checklistItem: 'Sink Faucet Location - Center',
              itemType: 'CHECKBOX',
              order: 83,
              isRequired: false,
              notesPrompt: 'Specify which basin center if applicable'
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    console.log('✅ Pre-Production Check template created successfully');
    console.log(`   - Template ID: ${template.id}`);
    console.log(`   - Total items: ${template.items.length}`);
    console.log(`   - Dynamic items: ${template.items.filter(item => item.applicabilityCondition).length}`);
    
  } catch (error) {
    console.error('❌ Error seeding Pre-Production Check template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedPreProductionCheckTemplate()
  .then(() => console.log('🎉 Pre-Production Check template seeding completed'))
  .catch((error) => {
    console.error('💥 Pre-Production Check template seeding failed:', error);
    process.exit(1);
  });