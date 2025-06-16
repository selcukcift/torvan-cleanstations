const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareSchemaAndDatabase() {
  try {
    console.log('🔍 Comparing Prisma schema with actual database...');
    
    // Get all tables from database
    const dbTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != '_prisma_migrations'
      ORDER BY table_name;
    `;
    
    const dbTableNames = dbTables.map(t => t.table_name);
    
    // Known schema models (manually listed for comparison)
    const schemaModels = [
      'Part', 'Assembly', 'AssemblyComponent', 'Category', 'Subcategory', 'User', 'Order',
      'BasinConfiguration', 'FaucetConfiguration', 'SprayerConfiguration', 'SinkConfiguration',
      'SelectedAccessory', 'AssociatedDocument', 'Bom', 'BomItem', 'OrderHistoryLog', 'OrderComment',
      'Notification', 'QcFormTemplate', 'QcFormTemplateItem', 'OrderQcResult', 'OrderQcItemResult',
      'ServiceOrder', 'ServiceOrderItem', 'WorkInstruction', 'WorkInstructionStep', 'Tool',
      'Task', 'TaskRequiredPart', 'TaskDependency', 'TaskTool', 'TaskNote', 'SystemNotification',
      'FileUpload', 'InventoryItem', 'InventoryTransaction', 'AuditLog', 'TaskTemplate',
      'TaskTemplateStep', 'TaskTemplateStepTool', 'TaskTemplateStepPart', 'TestProcedureTemplate',
      'TestProcedureStepTemplate', 'OrderTestResult', 'OrderTestStepResult', 'NotificationPreference'
    ];
    
    console.log('\n📊 Database vs Schema Comparison:');
    console.log(`Database tables: ${dbTableNames.length}`);
    console.log(`Schema models: ${schemaModels.length}`);
    
    // Find tables in DB but not in schema
    const tablesNotInSchema = dbTableNames.filter(table => 
      !schemaModels.includes(table) && !table.startsWith('_')
    );
    
    // Find models in schema but not in DB
    const modelsNotInDB = schemaModels.filter(model => 
      !dbTableNames.includes(model)
    );
    
    if (tablesNotInSchema.length > 0) {
      console.log('\n❌ Tables in database but NOT in schema:');
      tablesNotInSchema.forEach(table => console.log(`  - ${table}`));
    }
    
    if (modelsNotInDB.length > 0) {
      console.log('\n❌ Models in schema but NOT in database:');
      modelsNotInDB.forEach(model => console.log(`  - ${model}`));
    }
    
    if (tablesNotInSchema.length === 0 && modelsNotInDB.length === 0) {
      console.log('\n✅ All models and tables are in sync!');
    }
    
    // Check for relation tables (many-to-many)
    const relationTables = dbTableNames.filter(table => table.startsWith('_'));
    if (relationTables.length > 0) {
      console.log('\n🔗 Relation tables (many-to-many):');
      relationTables.forEach(table => console.log(`  - ${table}`));
    }
    
    // List all tables for reference
    console.log('\n📋 All database tables:');
    dbTableNames.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareSchemaAndDatabase();