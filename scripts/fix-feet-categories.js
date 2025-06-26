const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFeetCategories() {
  try {
    console.log('\n🦶 Fixing Feet Type Assembly Categories...\n');
    
    // Define the feet assemblies that need category updates
    const feetAssemblies = [
      { assemblyId: 'ASSY-T2-LEVELING-CASTOR-475', name: 'Leveling Casters' },
      { assemblyId: 'ASSY-T2-SEISMIC-FEET', name: 'Seismic Feet' }
    ];
    
    // Update each assembly with the correct category and subcategory
    for (const feet of feetAssemblies) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: feet.assemblyId },
          data: {
            categoryCode: '721',
            subcategoryCode: '721.711'
          }
        });
        console.log(`✅ Updated ${feet.name}: ${updated.assemblyId}`);
        console.log(`   Original Name: ${updated.name}`);
        console.log(`   Category: ${updated.categoryCode} | Subcategory: ${updated.subcategoryCode}`);
      } catch (error) {
        console.log(`❌ Failed to update ${feet.assemblyId}: ${error.message}`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Running verification...\n');
    
    // Verify the updates - check for feet types in the correct category
    const verifyFeet = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: '721.711',
        OR: [
          { assemblyId: { contains: 'CASTOR' } },
          { assemblyId: { contains: 'SEISMIC' } }
        ]
      },
      select: {
        assemblyId: true,
        name: true
      }
    });
    
    console.log(`✅ Total feet types with correct categories: ${verifyFeet.length}`);
    
    verifyFeet.forEach(feet => {
      const type = feet.assemblyId.includes('CASTOR') ? 'Leveling Casters' : 'Seismic Feet';
      console.log(`   - ${type}: ${feet.assemblyId}`);
      console.log(`     Full Name: ${feet.name}`);
    });
    
    if (verifyFeet.length === 2) {
      console.log('\n🎉 SUCCESS: Both feet types are now properly categorized!');
      console.log('   - Leveling Casters (4.75" overall height)');
      console.log('   - Seismic Feet (adjustable 1-5/8"OD x 6"H)');
    } else {
      console.log(`\n⚠️  WARNING: Expected 2 feet types but found ${verifyFeet.length}`);
    }
    
    // Also show all items in the same category for context
    console.log('\n\n📊 All items in category 721.711 (Legs & Feet):');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const allInCategory = await prisma.assembly.findMany({
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
    
    console.log(`Total items: ${allInCategory.length}`);
    
    const legs = allInCategory.filter(item => 
      item.assemblyId.includes('DL27') || 
      item.assemblyId.includes('DL14') || 
      item.assemblyId.includes('LC1')
    );
    const feet = allInCategory.filter(item => 
      item.assemblyId.includes('CASTOR') || 
      item.assemblyId.includes('SEISMIC')
    );
    
    console.log(`\n🦵 Legs: ${legs.length} types`);
    legs.forEach(leg => console.log(`   - ${leg.assemblyId}`));
    
    console.log(`\n🦶 Feet: ${feet.length} types`);
    feet.forEach(f => console.log(`   - ${f.assemblyId}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixFeetCategories();