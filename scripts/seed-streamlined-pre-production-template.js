const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedStreamlinedPreProductionTemplate() {
  console.log('🌱 Seeding Streamlined Pre-Production Check template...');
  
  try {
    // Remove existing Pre-Production Check template
    console.log('🗑️  Removing existing template to replace with streamlined version...');
    await prisma.qcFormTemplate.deleteMany({
      where: { name: 'Pre-Production Check' }
    });

    // Create the streamlined Pre-Production Check template
    const template = await prisma.qcFormTemplate.create({
      data: {
        name: 'Pre-Production Check',
        description: 'Streamlined Pre-Production Quality Control Checklist',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: {
          create: [
            // CONFIGURATION VERIFICATION TAB
            {
              section: 'Configuration Verification',
              checklistItem: 'Basin count verification',
              itemType: 'CHECKBOX',
              order: 10,
              isRequired: true,
              notesPrompt: 'Verify that the physical build matches the expected basin count'
            },
            {
              section: 'Configuration Verification',
              checklistItem: 'Pegboard verification',
              itemType: 'CHECKBOX',
              order: 11,
              isRequired: false,
              applicabilityCondition: 'configuration.pegboard === true',
              notesPrompt: 'Verify that the physical build matches the pegboard specification'
            },
            {
              section: 'Configuration Verification', 
              checklistItem: 'Feet type verification',
              itemType: 'CHECKBOX',
              order: 12,
              isRequired: true,
              notesPrompt: 'Verify that the physical build matches the feet type specification'
            },
            {
              section: 'Configuration Verification',
              checklistItem: 'Sink dimensions verification',
              itemType: 'CHECKBOX',
              order: 13,
              isRequired: true,
              notesPrompt: 'Verify that the physical build matches the sink dimensions specification'
            },

            // JOB INFORMATION TAB
            {
              section: 'Job Information',
              checklistItem: 'Job ID Number entry',
              itemType: 'TEXT_INPUT',
              order: 20,
              isRequired: true,
              notesPrompt: 'Enter and verify the Job ID number matches order'
            },

            // STRUCTURAL COMPONENTS TAB
            {
              section: 'Structural Components',
              checklistItem: 'Leveling casters installed and functional',
              itemType: 'CHECKBOX',
              order: 30,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.feet.type === "LEVELING_CASTERS"',
              notesPrompt: 'Test locking mechanism and leveling adjustment on all casters'
            },
            {
              section: 'Structural Components',
              checklistItem: 'Lifter control button type verified',
              itemType: 'SINGLE_SELECT',
              order: 31,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.legs.typeId && !configuration.structuralComponents.legs.typeId.includes("-FH-")',
              options: JSON.stringify(['DPF1K (Non-Programmable)', 'DP1C (Programmable)']),
              notesPrompt: 'Verify correct lifter control button installed for height-adjustable legs'
            },
            {
              section: 'Structural Components',
              checklistItem: 'Lifter controller installed underneath sink',
              itemType: 'CHECKBOX',
              order: 32,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.legs.typeId && !configuration.structuralComponents.legs.typeId.includes("-FH-")',
              notesPrompt: 'Verify lifter controller is properly mounted underneath the sink and accessible'
            },

            // MOUNTING & HOLES TAB
            {
              section: 'Mounting & Holes',
              checklistItem: 'Faucet holes location matches specifications',
              itemType: 'CHECKBOX',
              order: 40,
              isRequired: true,
              notesPrompt: 'Verify faucet hole positions match drawing and customer requirements'
            },
            {
              section: 'Mounting & Holes',
              checklistItem: 'Mounting holes match drawing specifications',
              itemType: 'CHECKBOX',
              order: 41,
              isRequired: true,
              notesPrompt: 'Check all mounting hole positions and sizes'
            },

            // BASIN INSPECTION TAB
            // Basin dimensions - repeats per basin
            {
              section: 'Basin Inspection',
              checklistItem: 'Basin dimensions verified',
              itemType: 'CHECKBOX',
              order: 50,
              isRequired: true,
              repeatPer: 'basin',
              notesPrompt: 'Verify basin dimensions match specifications'
            },
            // Drain location - repeats per basin
            {
              section: 'Basin Inspection',
              checklistItem: 'Drain location verified',
              itemType: 'SINGLE_SELECT',
              order: 51,
              isRequired: true,
              repeatPer: 'basin',
              options: JSON.stringify(['Center', 'Left', 'Right', 'Back-Left', 'Back-Right']),
              notesPrompt: 'Verify drain location matches specifications'
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    // Count items by type
    const totalItems = template.items.length;
    const dynamicItems = template.items.filter(item => item.applicabilityCondition).length;
    const basinRepeatedItems = template.items.filter(item => item.repeatPer === 'basin').length;

    console.log('✅ Streamlined Pre-Production Check template created successfully');
    console.log(`   - Template ID: ${template.id}`);
    console.log(`   - Total items: ${totalItems} (streamlined from 21 to ${totalItems})`);
    console.log(`   - Dynamic items: ${dynamicItems}`);
    console.log(`   - Basin-repeated items: ${basinRepeatedItems}`);
    console.log('   - ✅ Only essential items as specified by user');
    console.log('   - ✅ Logical tab groupings:');
    console.log('     • Configuration Verification (4 items)');
    console.log('     • Job Information (1 item)');
    console.log('     • Structural Components (3 items)');
    console.log('     • Mounting & Holes (2 items)');
    console.log('     • Basin Inspection (2 items per basin)');

    return template;

  } catch (error) {
    console.error('❌ Error seeding streamlined template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedStreamlinedPreProductionTemplate()
  .then(() => console.log('🎉 Streamlined Pre-Production Check template seeding completed'))
  .catch((error) => {
    console.error('💥 Streamlined template seeding failed:', error);
    process.exit(1);
  });