const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateBasinConfigurations() {
  try {
    console.log('🚀 Starting basin configuration migration...');
    
    // Find all records with basinCount > 1
    const consolidatedRecords = await prisma.basinConfiguration.findMany({
      where: {
        basinCount: {
          gt: 1
        }
      }
    });
    
    console.log(`Found ${consolidatedRecords.length} consolidated records to split`);
    
    if (consolidatedRecords.length === 0) {
      console.log('✅ No migration needed - all records already individual');
      return;
    }
    
    let totalSplitRecords = 0;
    
    // Process each consolidated record
    for (const record of consolidatedRecords) {
      console.log(`\n🔄 Processing record ${record.id}: ${record.basinCount} basins of type ${record.basinTypeId}`);
      
      // Create individual records for each basin count
      const individualRecords = [];
      for (let i = 0; i < record.basinCount; i++) {
        individualRecords.push({
          buildNumber: record.buildNumber,
          orderId: record.orderId,
          basinTypeId: record.basinTypeId,
          basinSizePartNumber: record.basinSizePartNumber,
          basinCount: 1, // Each record represents one basin
          addonIds: record.addonIds,
          customDepth: record.customDepth,
          customLength: record.customLength,
          customWidth: record.customWidth
        });
      }
      
      // Create the individual records
      const createResult = await prisma.basinConfiguration.createMany({
        data: individualRecords
      });
      
      console.log(`  ✅ Created ${createResult.count} individual records`);
      totalSplitRecords += createResult.count;
      
      // Delete the original consolidated record
      await prisma.basinConfiguration.delete({
        where: { id: record.id }
      });
      
      console.log(`  🗑️ Deleted original consolidated record`);
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`- Processed ${consolidatedRecords.length} consolidated records`);
    console.log(`- Created ${totalSplitRecords} individual basin records`);
    console.log(`- Deleted ${consolidatedRecords.length} consolidated records`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const remainingConsolidated = await prisma.basinConfiguration.count({
      where: { basinCount: { gt: 1 } }
    });
    
    const totalRecords = await prisma.basinConfiguration.count();
    
    if (remainingConsolidated === 0) {
      console.log(`✅ Migration verified: All ${totalRecords} basin configurations are now individual records`);
    } else {
      console.error(`❌ Migration incomplete: ${remainingConsolidated} consolidated records still exist`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateBasinConfigurations();