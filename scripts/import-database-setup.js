const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importDatabaseSetup() {
  try {
    console.log('📥 Importing database setup...');
    
    const exportPath = path.join(__dirname, 'database-export.json');
    
    if (!fs.existsSync(exportPath)) {
      console.error('❌ Export file not found at:', exportPath);
      console.log('Please make sure database-export.json is in the scripts folder');
      process.exit(1);
    }
    
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    
    console.log('📊 Import Summary:');
    console.log(`Export created: ${exportData.metadata.exportedAt}`);
    Object.entries(exportData.counts).forEach(([table, count]) => {
      console.log(`  ${table.padEnd(25)}: ${count} records`);
    });
    
    console.log('\n⚠️  WARNING: This will clear existing data and import new data.');
    console.log('Make sure your database is properly migrated first!');
    console.log('\nStarting import in 5 seconds... (Press Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Import in dependency order
    
    console.log('\n1. Importing categories...');
    await prisma.category.deleteMany();
    if (exportData.data.categories.length > 0) {
      await prisma.category.createMany({ data: exportData.data.categories });
    }
    
    console.log('2. Importing subcategories...');
    await prisma.subcategory.deleteMany();
    if (exportData.data.subcategories.length > 0) {
      await prisma.subcategory.createMany({ data: exportData.data.subcategories });
    }
    
    console.log('3. Importing users...');
    await prisma.user.deleteMany();
    if (exportData.data.users.length > 0) {
      // Add default password for imported users
      const usersWithPassword = exportData.data.users.map(user => ({
        ...user,
        password: '$2a$10$defaultHashForImportedUsers' // You'll need to reset passwords
      }));
      await prisma.user.createMany({ data: usersWithPassword });
    }
    
    console.log('4. Importing parts...');
    await prisma.part.deleteMany();
    if (exportData.data.parts.length > 0) {
      await prisma.part.createMany({ data: exportData.data.parts });
    }
    
    console.log('5. Importing assemblies...');
    await prisma.assembly.deleteMany();
    if (exportData.data.assemblies.length > 0) {
      await prisma.assembly.createMany({ data: exportData.data.assemblies });
    }
    
    console.log('6. Importing assembly components...');
    await prisma.assemblyComponent.deleteMany();
    if (exportData.data.assemblyComponents.length > 0) {
      await prisma.assemblyComponent.createMany({ data: exportData.data.assemblyComponents });
    }
    
    console.log('7. Importing tools...');
    await prisma.tool.deleteMany();
    if (exportData.data.tools.length > 0) {
      await prisma.tool.createMany({ data: exportData.data.tools });
    }
    
    console.log('8. Importing work instructions...');
    await prisma.workInstructionStep.deleteMany();
    await prisma.workInstruction.deleteMany();
    if (exportData.data.workInstructions.length > 0) {
      await prisma.workInstruction.createMany({ data: exportData.data.workInstructions });
    }
    if (exportData.data.workInstructionSteps.length > 0) {
      await prisma.workInstructionStep.createMany({ data: exportData.data.workInstructionSteps });
    }
    
    console.log('9. Importing QC templates...');
    await prisma.qcFormTemplateItem.deleteMany();
    await prisma.qcFormTemplate.deleteMany();
    if (exportData.data.qcFormTemplates.length > 0) {
      await prisma.qcFormTemplate.createMany({ data: exportData.data.qcFormTemplates });
    }
    if (exportData.data.qcFormTemplateItems.length > 0) {
      await prisma.qcFormTemplateItem.createMany({ data: exportData.data.qcFormTemplateItems });
    }
    
    console.log('10. Importing task templates...');
    await prisma.taskTemplateStep.deleteMany();
    await prisma.taskTemplate.deleteMany();
    if (exportData.data.taskTemplates.length > 0) {
      await prisma.taskTemplate.createMany({ data: exportData.data.taskTemplates });
    }
    if (exportData.data.taskTemplateSteps.length > 0) {
      await prisma.taskTemplateStep.createMany({ data: exportData.data.taskTemplateSteps });
    }
    
    console.log('11. Importing test procedure templates...');
    await prisma.testProcedureStepTemplate.deleteMany();
    await prisma.testProcedureTemplate.deleteMany();
    if (exportData.data.testProcedureTemplates.length > 0) {
      await prisma.testProcedureTemplate.createMany({ data: exportData.data.testProcedureTemplates });
    }
    if (exportData.data.testProcedureStepTemplates.length > 0) {
      await prisma.testProcedureStepTemplate.createMany({ data: exportData.data.testProcedureStepTemplates });
    }
    
    console.log('12. Importing inventory items...');
    await prisma.inventoryItem.deleteMany();
    if (exportData.data.inventoryItems.length > 0) {
      await prisma.inventoryItem.createMany({ data: exportData.data.inventoryItems });
    }
    
    console.log('13. Importing orders and configurations...');
    // Clear order-related data
    await prisma.selectedAccessory.deleteMany();
    await prisma.sprayerConfiguration.deleteMany();
    await prisma.faucetConfiguration.deleteMany();
    await prisma.basinConfiguration.deleteMany();
    await prisma.sinkConfiguration.deleteMany();
    await prisma.order.deleteMany();
    
    if (exportData.data.orders.length > 0) {
      await prisma.order.createMany({ data: exportData.data.orders });
    }
    if (exportData.data.sinkConfigurations.length > 0) {
      await prisma.sinkConfiguration.createMany({ data: exportData.data.sinkConfigurations });
    }
    if (exportData.data.basinConfigurations.length > 0) {
      await prisma.basinConfiguration.createMany({ data: exportData.data.basinConfigurations });
    }
    if (exportData.data.faucetConfigurations.length > 0) {
      await prisma.faucetConfiguration.createMany({ data: exportData.data.faucetConfigurations });
    }
    if (exportData.data.sprayerConfigurations.length > 0) {
      await prisma.sprayerConfiguration.createMany({ data: exportData.data.sprayerConfigurations });
    }
    if (exportData.data.selectedAccessories.length > 0) {
      await prisma.selectedAccessory.createMany({ data: exportData.data.selectedAccessories });
    }
    
    console.log('\n✅ Database import completed successfully!');
    console.log('\n📋 Post-import steps:');
    console.log('1. Reset user passwords (they were not exported for security)');
    console.log('2. Test the application functionality');
    console.log('3. Update any environment-specific configurations');
    
    // Verify import
    const finalCounts = {
      parts: await prisma.part.count(),
      assemblies: await prisma.assembly.count(),
      users: await prisma.user.count(),
      orders: await prisma.order.count(),
      qcTemplates: await prisma.qcFormTemplate.count()
    };
    
    console.log('\n📊 Final verification:');
    Object.entries(finalCounts).forEach(([table, count]) => {
      console.log(`  ${table.padEnd(15)}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

importDatabaseSetup().catch(console.error);