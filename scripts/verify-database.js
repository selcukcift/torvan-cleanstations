const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Verifying Database Seeding Status...\n');
  
  try {
    // 1. Check Users
    console.log('📋 USERS:');
    const users = await prisma.user.findMany({
      select: { username: true, role: true, email: true, isActive: true }
    });
    console.log(`Total Users: ${users.length}`);
    users.forEach(user => {
      console.log(`  ✓ ${user.username} (${user.role}) - ${user.email} - Active: ${user.isActive}`);
    });

    // 2. Check Categories
    console.log('\n📋 CATEGORIES:');
    const categories = await prisma.category.count();
    const subcategories = await prisma.subcategory.count();
    console.log(`Total Categories: ${categories}`);
    console.log(`Total Subcategories: ${subcategories}`);

    // 3. Check Parts
    console.log('\n📋 PARTS:');
    const parts = await prisma.part.count();
    const partTypes = await prisma.part.groupBy({
      by: ['type'],
      _count: { type: true }
    });
    console.log(`Total Parts: ${parts}`);
    partTypes.forEach(pt => {
      console.log(`  ✓ ${pt.type}: ${pt._count.type} parts`);
    });

    // 4. Check Assemblies
    console.log('\n📋 ASSEMBLIES:');
    const assemblies = await prisma.assembly.count();
    const assemblyTypes = await prisma.assembly.groupBy({
      by: ['type'],
      _count: { type: true }
    });
    console.log(`Total Assemblies: ${assemblies}`);
    assemblyTypes.forEach(at => {
      console.log(`  ✓ ${at.type}: ${at._count.type} assemblies`);
    });

    // Check Pegboard Kits specifically
    const pegboardKits = await prisma.assembly.count({
      where: { assemblyId: { startsWith: 'T2-ADW-PB-' } }
    });
    console.log(`  ✓ Pegboard Kits: ${pegboardKits}`);

    // 5. Check Assembly Components
    console.log('\n📋 ASSEMBLY COMPONENTS:');
    const components = await prisma.assemblyComponent.count();
    console.log(`Total Assembly Components: ${components}`);

    // 6. Check Orders
    console.log('\n📋 ORDERS:');
    const orders = await prisma.order.count();
    const orderStatuses = await prisma.order.groupBy({
      by: ['orderStatus'],
      _count: { orderStatus: true }
    });
    console.log(`Total Orders: ${orders}`);
    orderStatuses.forEach(os => {
      console.log(`  ✓ ${os.orderStatus}: ${os._count.orderStatus} orders`);
    });

    // 7. Check QC Templates
    console.log('\n📋 QC TEMPLATES:');
    const qcTemplates = await prisma.qcFormTemplate.count();
    const qcTemplateItems = await prisma.qcFormTemplateItem.count();
    console.log(`Total QC Templates: ${qcTemplates}`);
    console.log(`Total QC Template Items: ${qcTemplateItems}`);

    // 8. Check Task Templates
    console.log('\n📋 TASK TEMPLATES:');
    const taskTemplates = await prisma.taskTemplate.count();
    const taskTemplateSteps = await prisma.taskTemplateStep.count();
    console.log(`Total Task Templates: ${taskTemplates}`);
    console.log(`Total Task Template Steps: ${taskTemplateSteps}`);

    // 9. Check Test Procedures
    console.log('\n📋 TEST PROCEDURES:');
    const testProcedures = await prisma.testProcedureTemplate.count();
    const testSteps = await prisma.testProcedureStepTemplate.count();
    console.log(`Total Test Procedures: ${testProcedures}`);
    console.log(`Total Test Steps: ${testSteps}`);

    // 10. Check Work Instructions
    console.log('\n📋 WORK INSTRUCTIONS:');
    const workInstructions = await prisma.workInstruction.count();
    const workSteps = await prisma.workInstructionStep.count();
    console.log(`Total Work Instructions: ${workInstructions}`);
    console.log(`Total Work Instruction Steps: ${workSteps}`);

    // 11. Check Tools
    console.log('\n📋 TOOLS:');
    const tools = await prisma.tool.count();
    console.log(`Total Tools: ${tools}`);

    // 12. Check Inventory
    console.log('\n📋 INVENTORY:');
    const inventoryItems = await prisma.inventoryItem.count();
    const inventoryTransactions = await prisma.inventoryTransaction.count();
    console.log(`Total Inventory Items: ${inventoryItems}`);
    console.log(`Total Inventory Transactions: ${inventoryTransactions}`);

    // 13. Check Production Tables (NEW)
    console.log('\n📋 PRODUCTION TABLES:');
    const productionChecklists = await prisma.productionChecklist.count();
    const productionTasks = await prisma.productionTask.count();
    const productionDocuments = await prisma.productionDocument.count();
    const productionMetrics = await prisma.productionMetrics.count();
    const productionSyncs = await prisma.productionWorkstationSync.count();
    
    console.log(`Total Production Checklists: ${productionChecklists}`);
    console.log(`Total Production Tasks: ${productionTasks}`);
    console.log(`Total Production Documents: ${productionDocuments}`);
    console.log(`Total Production Metrics: ${productionMetrics}`);
    console.log(`Total Production Workstation Syncs: ${productionSyncs}`);

    // 14. Check Sample Data
    console.log('\n📋 SAMPLE DATA:');
    const boms = await prisma.bom.count();
    const bomItems = await prisma.bomItem.count();
    const tasks = await prisma.task.count();
    const notifications = await prisma.notification.count();
    const serviceOrders = await prisma.serviceOrder.count();
    
    console.log(`Total BOMs: ${boms}`);
    console.log(`Total BOM Items: ${bomItems}`);
    console.log(`Total Tasks: ${tasks}`);
    console.log(`Total Notifications: ${notifications}`);
    console.log(`Total Service Orders: ${serviceOrders}`);

    // 15. Summary
    console.log('\n📊 SEEDING SUMMARY:');
    const expectedMinimums = {
      users: 8,
      categories: 5,
      parts: 100,
      assemblies: 300,
      pegboardKits: 146,
      qcTemplates: 3,
      taskTemplates: 3,
      testProcedures: 3
    };

    let allGood = true;
    if (users.length < expectedMinimums.users) {
      console.log(`❌ Users: Expected at least ${expectedMinimums.users}, found ${users.length}`);
      allGood = false;
    } else {
      console.log(`✅ Users: ${users.length} (Expected: ${expectedMinimums.users}+)`);
    }

    if (categories < expectedMinimums.categories) {
      console.log(`❌ Categories: Expected at least ${expectedMinimums.categories}, found ${categories}`);
      allGood = false;
    } else {
      console.log(`✅ Categories: ${categories} (Expected: ${expectedMinimums.categories}+)`);
    }

    if (parts < expectedMinimums.parts) {
      console.log(`❌ Parts: Expected at least ${expectedMinimums.parts}, found ${parts}`);
      allGood = false;
    } else {
      console.log(`✅ Parts: ${parts} (Expected: ${expectedMinimums.parts}+)`);
    }

    if (assemblies < expectedMinimums.assemblies) {
      console.log(`❌ Assemblies: Expected at least ${expectedMinimums.assemblies}, found ${assemblies}`);
      allGood = false;
    } else {
      console.log(`✅ Assemblies: ${assemblies} (Expected: ${expectedMinimums.assemblies}+)`);
    }

    if (pegboardKits < expectedMinimums.pegboardKits) {
      console.log(`❌ Pegboard Kits: Expected at least ${expectedMinimums.pegboardKits}, found ${pegboardKits}`);
      allGood = false;
    } else {
      console.log(`✅ Pegboard Kits: ${pegboardKits} (Expected: ${expectedMinimums.pegboardKits}+)`);
    }

    if (qcTemplates < expectedMinimums.qcTemplates) {
      console.log(`❌ QC Templates: Expected at least ${expectedMinimums.qcTemplates}, found ${qcTemplates}`);
      allGood = false;
    } else {
      console.log(`✅ QC Templates: ${qcTemplates} (Expected: ${expectedMinimums.qcTemplates}+)`);
    }

    if (taskTemplates < expectedMinimums.taskTemplates) {
      console.log(`❌ Task Templates: Expected at least ${expectedMinimums.taskTemplates}, found ${taskTemplates}`);
      allGood = false;
    } else {
      console.log(`✅ Task Templates: ${taskTemplates} (Expected: ${expectedMinimums.taskTemplates}+)`);
    }

    if (testProcedures < expectedMinimums.testProcedures) {
      console.log(`❌ Test Procedures: Expected at least ${expectedMinimums.testProcedures}, found ${testProcedures}`);
      allGood = false;
    } else {
      console.log(`✅ Test Procedures: ${testProcedures} (Expected: ${expectedMinimums.testProcedures}+)`);
    }

    console.log('\n' + '='.repeat(50));
    if (allGood) {
      console.log('✅ DATABASE IS PROPERLY SEEDED!');
    } else {
      console.log('❌ DATABASE IS MISSING SOME SEED DATA!');
      console.log('Run: npm run db:reset');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error verifying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();