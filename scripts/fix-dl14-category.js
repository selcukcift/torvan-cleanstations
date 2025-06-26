const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDL14Category() {
  try {
    console.log('\n🔧 Fixing DL14 Height Adjustable Category...\n');
    
    const updated = await prisma.assembly.update({
      where: { assemblyId: 'ASSY-T2-DL14-KIT' },
      data: {
        categoryCode: '721',
        subcategoryCode: '721.711'
      }
    });
    
    console.log(`✅ Updated: ${updated.assemblyId}`);
    console.log(`   Name: ${updated.name}`);
    console.log(`   Category: ${updated.categoryCode} | Subcategory: ${updated.subcategoryCode}`);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Final verification of all leg types:\n');
    
    // Final check
    const allLegs = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: '721.711'
      },
      select: {
        assemblyId: true,
        name: true
      },
      orderBy: {
        assemblyId: 'asc'
      }
    });
    
    console.log(`✅ Total leg types: ${allLegs.length}`);
    
    const heightAdjustable = allLegs.filter(leg => !leg.assemblyId.includes('-FH-'));
    const fixedHeight = allLegs.filter(leg => leg.assemblyId.includes('-FH-'));
    
    console.log(`\n📊 Height Adjustable: ${heightAdjustable.length} types`);
    heightAdjustable.forEach(leg => {
      const model = leg.name.match(/\((.*?)\)/)?.[1] || leg.assemblyId;
      console.log(`   ✅ ${model} - ${leg.assemblyId}`);
    });
    
    console.log(`\n📊 Fixed Height: ${fixedHeight.length} types`);
    fixedHeight.forEach(leg => {
      const model = leg.assemblyId.includes('DL27') ? 'DL27' : 'DL14';
      console.log(`   ❌ ${model} Fixed Height - ${leg.assemblyId}`);
    });
    
    if (heightAdjustable.length === 3 && fixedHeight.length === 2) {
      console.log('\n🎉 SUCCESS: All 5 leg types are properly configured!');
      console.log('   3 Height Adjustable (DL27, DL14, LC1)');
      console.log('   2 Fixed Height (DL27, DL14)');
      console.log('   Total: 5 leg type options');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDL14Category();