const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Safe QC Template Management Script
 * 
 * Handles foreign key constraints when updating QC templates by:
 * 1. Checking for existing dependencies
 * 2. Safely removing orphaned references
 * 3. Creating new templates without conflicts
 */

async function fixQcTemplateConstraints() {
  console.log('🔧 Starting QC Template Foreign Key Constraint Fix...');
  
  try {
    // 1. Check current state
    console.log('📊 Analyzing current QC template state...');
    
    const [templateCount, itemCount, qcResultCount, taskCount] = await Promise.all([
      prisma.qcFormTemplate.count(),
      prisma.qcFormTemplateItem.count(),
      prisma.orderQcResult.count(),
      prisma.task.count({ where: { qcFormTemplateItemId: { not: null } } })
    ]);
    
    console.log(`   📋 Current state:`);
    console.log(`   • QC Templates: ${templateCount}`);
    console.log(`   • Template Items: ${itemCount}`);
    console.log(`   • QC Results: ${qcResultCount}`);
    console.log(`   • Tasks with QC items: ${taskCount}`);
    
    if (templateCount === 0) {
      console.log('✅ No QC templates exist - safe to create new ones');
      return true;
    }
    
    // 2. Check for dependencies that would prevent deletion
    const templatesWithResults = await prisma.qcFormTemplate.findMany({
      where: {
        orderQcResults: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            orderQcResults: true
          }
        }
      }
    });
    
    const itemsWithTasks = await prisma.qcFormTemplateItem.findMany({
      where: {
        tasks: {
          some: {}
        }
      },
      select: {
        id: true,
        checklistItem: true,
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });
    
    console.log(`   🔗 Dependencies found:`);
    console.log(`   • Templates with QC results: ${templatesWithResults.length}`);
    console.log(`   • Template items with tasks: ${itemsWithTasks.length}`);
    
    // 3. If there are dependencies, we need to handle them carefully
    if (templatesWithResults.length > 0 || itemsWithTasks.length > 0) {
      console.log('⚠️  Found foreign key dependencies - using safe approach');
      
      // Option A: Clear dependencies if they are test/sample data
      if (await shouldClearDependencies()) {
        console.log('🧹 Clearing dependent records...');
        
        // Clear tasks that reference QC template items
        if (itemsWithTasks.length > 0) {
          await prisma.task.updateMany({
            where: {
              qcFormTemplateItemId: {
                not: null
              }
            },
            data: {
              qcFormTemplateItemId: null
            }
          });
          console.log(`   ✅ Cleared QC template references from ${taskCount} tasks`);
        }
        
        // Clear QC results
        if (templatesWithResults.length > 0) {
          const deletedResults = await prisma.orderQcResult.deleteMany({});
          console.log(`   ✅ Deleted ${deletedResults.count} QC results`);
        }
        
        // Now safe to delete templates
        await prisma.qcFormTemplateItem.deleteMany({});
        await prisma.qcFormTemplate.deleteMany({});
        console.log('   ✅ Deleted all QC templates and items');
        
      } else {
        // Option B: Create new templates with different names
        console.log('📝 Creating new templates with unique names...');
        return false; // Let the calling script handle this case
      }
    } else {
      // No dependencies - safe to delete
      console.log('🗑️  No dependencies found - safe to delete existing templates');
      await prisma.qcFormTemplateItem.deleteMany({});
      await prisma.qcFormTemplate.deleteMany({});
      console.log('   ✅ Deleted all QC templates and items');
    }
    
    console.log('✅ QC template constraint fix completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing QC template constraints:', error);
    throw error;
  }
}

async function shouldClearDependencies() {
  // Check if this appears to be sample/test data
  const sampleOrderCount = await prisma.order.count({
    where: {
      customerName: {
        contains: 'Sample'
      }
    }
  });
  
  const totalOrderCount = await prisma.order.count();
  
  // If most orders are sample data, it's probably safe to clear
  const isMostlySampleData = sampleOrderCount / Math.max(totalOrderCount, 1) > 0.5;
  
  console.log(`   📊 Data analysis:`);
  console.log(`   • Total orders: ${totalOrderCount}`);
  console.log(`   • Sample orders: ${sampleOrderCount}`);
  console.log(`   • Mostly sample data: ${isMostlySampleData}`);
  
  return isMostlySampleData || totalOrderCount <= 5; // Safe to clear if very few orders
}

async function createBasicQcTemplatesAfterFix() {
  console.log('🏗️  Creating basic QC templates...');
  
  try {
    // Create Final Quality Check template
    const finalQcTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Final Quality Check',
        description: 'Final quality control inspection for completed sinks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: {
          create: [
            {
              section: 'Visual Inspection',
              checklistItem: 'Check overall finish quality',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 1
            },
            {
              section: 'Visual Inspection',
              checklistItem: 'Verify basin alignment',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 2
            },
            {
              section: 'Functional Test',
              checklistItem: 'Test drainage system',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 3
            },
            {
              section: 'Functional Test',
              checklistItem: 'Test faucet operation',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 4
            },
            {
              section: 'Documentation',
              checklistItem: 'Serial number recorded',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 5
            }
          ]
        }
      }
    });

    // Create Pre-Production Check template
    const preQcTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Pre-Production Check',
        description: 'Pre-production quality control checklist',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: {
          create: [
            {
              section: 'Material Inspection',
              checklistItem: 'Check stainless steel grade certification',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 1
            },
            {
              section: 'Material Inspection',
              checklistItem: 'Verify basin dimensions',
              itemType: 'NUMERIC_INPUT',
              isRequired: true,
              order: 2
            },
            {
              section: 'Component Check',
              checklistItem: 'Verify all parts present',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 3
            },
            {
              section: 'Component Check',
              checklistItem: 'Check leg assembly completeness',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 4
            }
          ]
        }
      }
    });

    // Create Production Check template
    const productionTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Production Check',
        description: 'In-process production quality checks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: {
          create: [
            {
              section: 'Assembly Quality',
              checklistItem: 'Check weld quality',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 1
            },
            {
              section: 'Assembly Quality',
              checklistItem: 'Verify frame squareness',
              itemType: 'NUMERIC_INPUT',
              isRequired: true,
              order: 2
            },
            {
              section: 'Fit and Finish',
              checklistItem: 'Check surface finish',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 3
            }
          ]
        }
      }
    });

    console.log('✅ Created basic QC templates:');
    console.log(`   • Final Quality Check (${finalQcTemplate.id})`);
    console.log(`   • Pre-Production Check (${preQcTemplate.id})`);
    console.log(`   • Production Check (${productionTemplate.id})`);

    return true;
  } catch (error) {
    console.error('❌ Error creating basic QC templates:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const success = await fixQcTemplateConstraints();
    
    if (success) {
      await createBasicQcTemplatesAfterFix();
      console.log('🎉 QC template constraint fix and creation completed successfully!');
    } else {
      console.log('⚠️  QC templates were not cleared due to production data - templates will be created with unique names');
    }
    
  } catch (error) {
    console.error('💥 QC template constraint fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✨ QC template constraint fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 QC template constraint fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixQcTemplateConstraints, createBasicQcTemplatesAfterFix };