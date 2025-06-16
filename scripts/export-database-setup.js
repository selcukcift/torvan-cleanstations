const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportDatabaseSetup() {
  try {
    console.log('📦 Creating comprehensive database export for home setup...');
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'database-export-script',
        databaseVersion: '1.0',
        description: 'Complete database export for Clean Stations project'
      },
      counts: {},
      data: {}
    };
    
    // Export all data with counts
    console.log('📊 Exporting data...');
    
    exportData.data.users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // Note: Excluding password hash for security
      }
    });
    exportData.counts.users = exportData.data.users.length;
    
    exportData.data.categories = await prisma.category.findMany();
    exportData.counts.categories = exportData.data.categories.length;
    
    exportData.data.subcategories = await prisma.subcategory.findMany();
    exportData.counts.subcategories = exportData.data.subcategories.length;
    
    exportData.data.parts = await prisma.part.findMany();
    exportData.counts.parts = exportData.data.parts.length;
    
    exportData.data.assemblies = await prisma.assembly.findMany();
    exportData.counts.assemblies = exportData.data.assemblies.length;
    
    exportData.data.assemblyComponents = await prisma.assemblyComponent.findMany();
    exportData.counts.assemblyComponents = exportData.data.assemblyComponents.length;
    
    exportData.data.qcFormTemplates = await prisma.qcFormTemplate.findMany();
    exportData.counts.qcFormTemplates = exportData.data.qcFormTemplates.length;
    
    exportData.data.qcFormTemplateItems = await prisma.qcFormTemplateItem.findMany();
    exportData.counts.qcFormTemplateItems = exportData.data.qcFormTemplateItems.length;
    
    exportData.data.workInstructions = await prisma.workInstruction.findMany();
    exportData.counts.workInstructions = exportData.data.workInstructions.length;
    
    exportData.data.workInstructionSteps = await prisma.workInstructionStep.findMany();
    exportData.counts.workInstructionSteps = exportData.data.workInstructionSteps.length;
    
    exportData.data.tools = await prisma.tool.findMany();
    exportData.counts.tools = exportData.data.tools.length;
    
    exportData.data.taskTemplates = await prisma.taskTemplate.findMany();
    exportData.counts.taskTemplates = exportData.data.taskTemplates.length;
    
    exportData.data.taskTemplateSteps = await prisma.taskTemplateStep.findMany();
    exportData.counts.taskTemplateSteps = exportData.data.taskTemplateSteps.length;
    
    exportData.data.testProcedureTemplates = await prisma.testProcedureTemplate.findMany();
    exportData.counts.testProcedureTemplates = exportData.data.testProcedureTemplates.length;
    
    exportData.data.testProcedureStepTemplates = await prisma.testProcedureStepTemplate.findMany();
    exportData.counts.testProcedureStepTemplates = exportData.data.testProcedureStepTemplates.length;
    
    exportData.data.inventoryItems = await prisma.inventoryItem.findMany();
    exportData.counts.inventoryItems = exportData.data.inventoryItems.length;
    
    // Export sample orders (but exclude sensitive customer data)
    exportData.data.orders = await prisma.order.findMany({
      select: {
        id: true,
        poNumber: true,
        customerName: true,
        projectName: true,
        salesPerson: true,
        wantDate: true,
        language: true,
        orderStatus: true,
        buildNumbers: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    });
    exportData.counts.orders = exportData.data.orders.length;
    
    // Get all order configurations
    exportData.data.sinkConfigurations = await prisma.sinkConfiguration.findMany();
    exportData.data.basinConfigurations = await prisma.basinConfiguration.findMany();
    exportData.data.faucetConfigurations = await prisma.faucetConfiguration.findMany();
    exportData.data.sprayerConfigurations = await prisma.sprayerConfiguration.findMany();
    exportData.data.selectedAccessories = await prisma.selectedAccessory.findMany();
    
    exportData.counts.sinkConfigurations = exportData.data.sinkConfigurations.length;
    exportData.counts.basinConfigurations = exportData.data.basinConfigurations.length;
    exportData.counts.faucetConfigurations = exportData.data.faucetConfigurations.length;
    exportData.counts.sprayerConfigurations = exportData.data.sprayerConfigurations.length;
    exportData.counts.selectedAccessories = exportData.data.selectedAccessories.length;
    
    // Export the JSON file
    const exportPath = path.join(__dirname, 'database-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log('✅ Database export complete!');
    console.log(`📁 Export saved to: ${exportPath}`);
    console.log('\n📊 Export Summary:');
    Object.entries(exportData.counts).forEach(([table, count]) => {
      console.log(`  ${table.padEnd(25)}: ${count}`);
    });
    
    console.log('\n📋 To use this on your home setup:');
    console.log('1. Copy the entire project folder to your home machine');
    console.log('2. Set up PostgreSQL and update .env with your connection');
    console.log('3. Run: npx prisma migrate deploy');
    console.log('4. Run: node scripts/import-database-setup.js');
    console.log('5. Your database will be fully recreated with all data!');
    
    return exportPath;
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabaseSetup().catch(console.error);