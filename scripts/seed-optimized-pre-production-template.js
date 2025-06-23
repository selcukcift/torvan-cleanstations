const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedOptimizedPreProductionTemplate() {
  console.log('🌱 Seeding Optimized Pre-Production Check template...');

  try {
    // Remove existing template first
    const existingTemplate = await prisma.qcFormTemplate.findFirst({
      where: {
        name: 'Pre-Production Check',
        appliesToProductFamily: 'MDRD_T2_SINK'
      }
    });

    if (existingTemplate) {
      console.log('🗑️  Removing existing template to replace with optimized version...');
      await prisma.qcFormTemplate.delete({
        where: { id: existingTemplate.id }
      });
    }

    // Create optimized Pre-Production Check template
    const template = await prisma.qcFormTemplate.create({
      data: {
        name: 'Pre-Production Check',
        version: '2.0',
        description: 'Optimized pre-production checklist with configuration verification and no redundancies',
        isActive: true,
        appliesToProductFamily: 'MDRD_T2_SINK',
        items: {
          create: [
            // CONFIGURATION VERIFICATION SECTION
            {
              section: 'Configuration Verification',
              checklistItem: 'Verify Order Configuration Against Build',
              itemType: 'TEXT_INPUT',
              order: 1,
              isRequired: true,
              notesPrompt: 'This section will display expected configuration vs actual build for verification'
            },

            // JOB INFORMATION SECTION  
            {
              section: 'Job Information',
              checklistItem: 'Job ID Number Verified',
              itemType: 'TEXT_INPUT',
              order: 10,
              isRequired: true,
              notesPrompt: 'Enter and verify the Job ID number matches order'
            },

            // DOCUMENTATION & DRAWINGS
            {
              section: 'Documentation',
              checklistItem: 'Final approved drawing and paperwork attached',
              itemType: 'CHECKBOX',
              order: 20,
              isRequired: true,
              notesPrompt: 'Verify all required documentation is present and approved'
            },
            {
              section: 'Documentation', 
              checklistItem: 'BOM matches actual build configuration',
              itemType: 'CHECKBOX',
              order: 21,
              isRequired: true,
              notesPrompt: 'Cross-reference BOM with actual parts used in build'
            },

            // DIMENSIONAL VERIFICATION
            {
              section: 'Dimensions',
              checklistItem: 'Overall sink dimensions verified',
              itemType: 'CHECKBOX',
              order: 30,
              isRequired: true,
              notesPrompt: 'Measure and verify overall sink dimensions match specifications'
            },
            {
              section: 'Dimensions',
              checklistItem: 'Basin dimensions verified',
              itemType: 'CHECKBOX',
              order: 31,
              isRequired: true,
              repeatPer: 'basin',
              notesPrompt: 'Measure each basin individually and verify against specifications'
            },

            // STRUCTURAL COMPONENTS (Dynamic)
            {
              section: 'Structural Components',
              checklistItem: 'Pegboard installed with correct dimensions',
              itemType: 'CHECKBOX',
              order: 40,
              isRequired: false,
              applicabilityCondition: 'configuration.pegboard === true',
              notesPrompt: 'Verify pegboard dimensions match drawing specifications'
            },
            {
              section: 'Structural Components',
              checklistItem: 'Leveling casters installed and functional',
              itemType: 'CHECKBOX',
              order: 41,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.feet.type === "LEVELING_CASTERS"',
              notesPrompt: 'Test locking mechanism and leveling adjustment on all casters'
            },
            {
              section: 'Structural Components',
              checklistItem: 'Leveling feet installed and functional', 
              itemType: 'CHECKBOX',
              order: 42,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.feet.type === "LEVELING_FEET"',
              notesPrompt: 'Test leveling adjustment mechanism on all feet'
            },
            {
              section: 'Structural Components',
              checklistItem: 'Lifter control button type verified',
              itemType: 'SINGLE_SELECT',
              order: 43,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.legs.typeId && !configuration.structuralComponents.legs.typeId.includes("-FH-")',
              options: JSON.stringify(['DPF1K (Non-Programmable)', 'DP1C (Programmable)']),
              notesPrompt: 'Verify correct lifter control button installed for height-adjustable legs'
            },
            {
              section: 'Structural Components',
              checklistItem: 'Lifter controller installed underneath sink',
              itemType: 'CHECKBOX',
              order: 44,
              isRequired: false,
              applicabilityCondition: 'configuration.structuralComponents.legs.typeId && !configuration.structuralComponents.legs.typeId.includes("-FH-")',
              notesPrompt: 'Verify lifter controller is properly mounted underneath the sink and accessible'
            },

            // MOUNTING & HOLES
            {
              section: 'Mounting',
              checklistItem: 'Faucet holes location matches specifications',
              itemType: 'CHECKBOX',
              order: 50,
              isRequired: true,
              notesPrompt: 'Verify faucet hole positions match drawing and customer requirements'
            },
            {
              section: 'Mounting',
              checklistItem: 'Mounting holes match drawing specifications',
              itemType: 'CHECKBOX',
              order: 51,
              isRequired: true,
              notesPrompt: 'Check all mounting hole positions and sizes'
            },

            // BASIN INSPECTION (Dynamic - will be repeated per basin)
            {
              section: 'Basin Inspection',
              checklistItem: 'Basin verified and functional',
              itemType: 'CHECKBOX',
              order: 60,
              isRequired: true,
              repeatPer: 'basin',
              notesPrompt: 'Complete visual and functional inspection of basin'
            },
            {
              section: 'Basin Inspection',
              checklistItem: 'Bottom fill hole present and clear',
              itemType: 'CHECKBOX',
              order: 61,
              isRequired: true,
              repeatPer: 'basin',
              notesPrompt: 'Verify bottom fill hole is properly positioned and unobstructed'
            },
            {
              section: 'Basin Inspection',
              checklistItem: 'Drain button installed and functional',
              itemType: 'CHECKBOX',
              order: 62,
              isRequired: true,
              repeatPer: 'basin',
              notesPrompt: 'Test drain button operation and ensure proper sealing'
            },
            {
              section: 'Basin Inspection',
              checklistItem: 'Basin light installed and working',
              itemType: 'CHECKBOX',
              order: 63,
              isRequired: true,
              repeatPer: 'basin',
              notesPrompt: 'Test basin light functionality and verify proper mounting'
            },
            {
              section: 'Basin Inspection',
              checklistItem: 'Drain location verified',
              itemType: 'SINGLE_SELECT',
              order: 64,
              isRequired: true,
              options: JSON.stringify(['Center', 'Off-Center', 'Custom']),
              repeatPer: 'basin',
              notesPrompt: 'Verify drain position matches specification. If custom, provide details.'
            },

            // FINAL VERIFICATION
            {
              section: 'Final Verification',
              checklistItem: 'All specifications verified against order',
              itemType: 'CHECKBOX',
              order: 70,
              isRequired: true,
              notesPrompt: 'Final verification that all aspects match order requirements'
            },
            {
              section: 'Final Verification',
              checklistItem: 'No defects or damage observed',
              itemType: 'CHECKBOX',
              order: 71,
              isRequired: true,
              notesPrompt: 'Visual inspection for any defects, scratches, or damage'
            },
            {
              section: 'Final Verification',
              checklistItem: 'Ready for production approval',
              itemType: 'CHECKBOX',
              order: 72,
              isRequired: true,
              notesPrompt: 'Final approval that sink is ready to proceed to production'
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    console.log('✅ Optimized Pre-Production Check template created successfully');
    console.log(`   - Template ID: ${template.id}`);
    console.log(`   - Total items: ${template.items.length} (reduced from 27 to ${template.items.length})`);
    console.log(`   - Dynamic items: ${template.items.filter(item => item.applicabilityCondition).length}`);
    console.log(`   - Basin-repeated items: ${template.items.filter(item => item.repeatPer === 'basin').length}`);
    console.log('   - ✅ Eliminated redundant Basin 2 & Basin 3 sections');
    console.log('   - ✅ Added Configuration Verification section');
    console.log('   - ✅ Consolidated faucet location logic');
    console.log('   - ✅ Standardized dynamic item handling');
    
  } catch (error) {
    console.error('❌ Error seeding optimized Pre-Production Check template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedOptimizedPreProductionTemplate()
  .then(() => console.log('🎉 Optimized Pre-Production Check template seeding completed'))
  .catch((error) => {
    console.error('💥 Optimized Pre-Production Check template seeding failed:', error);
    process.exit(1);
  });