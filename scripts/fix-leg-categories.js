const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLegCategories() {
  try {
    console.log('\n🔧 Fixing Leg Assembly Categories...\n');
    
    // Define the leg assemblies that need category updates
    const legAssemblies = [
      { assemblyId: 'T2-DL27-KIT', name: 'DL27 Height Adjustable' },
      { assemblyId: 'T2-DL14-KIT', name: 'DL14 Height Adjustable' },
      { assemblyId: 'T2-LC1-KIT', name: 'LC1 Height Adjustable' },
      { assemblyId: 'T2-DL27-FH-KIT', name: 'DL27 Fixed Height' },
      { assemblyId: 'T2-DL14-FH-KIT', name: 'DL14 Fixed Height' }
    ];
    
    // Update each assembly with the correct category and subcategory
    for (const leg of legAssemblies) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: leg.assemblyId },
          data: {
            categoryCode: '721',
            subcategoryCode: '721.711'
          }
        });
        console.log(`✅ Updated ${leg.name}: ${updated.assemblyId}`);
        console.log(`   Category: ${updated.categoryCode} | Subcategory: ${updated.subcategoryCode}`);
      } catch (error) {
        console.log(`❌ Failed to update ${leg.assemblyId}: ${error.message}`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Running verification...\n');
    
    // Verify the updates
    const verifyLegs = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: '721.711'
      },
      select: {
        assemblyId: true,
        name: true
      }
    });
    
    console.log(`✅ Total leg types with correct categories: ${verifyLegs.length}`);
    
    const heightAdjustable = verifyLegs.filter(leg => !leg.assemblyId.includes('-FH-'));
    const fixedHeight = verifyLegs.filter(leg => leg.assemblyId.includes('-FH-'));
    
    console.log(`   Height Adjustable: ${heightAdjustable.length}`);
    heightAdjustable.forEach(leg => console.log(`      - ${leg.assemblyId}`));
    
    console.log(`\n   Fixed Height: ${fixedHeight.length}`);
    fixedHeight.forEach(leg => console.log(`      - ${leg.assemblyId}`));
    
    if (heightAdjustable.length === 3 && fixedHeight.length === 2) {
      console.log('\n🎉 SUCCESS: All 5 leg types are now properly categorized!');
      console.log('   3 Height Adjustable + 2 Fixed Height = 5 Total');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixLegCategories();