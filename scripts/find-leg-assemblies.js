const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findLegAssemblies() {
  try {
    console.log('\n🦵 Searching for Leg Assemblies in Database...\n');
    
    // Search by name patterns
    const legPatterns = ['LEG', 'DL27', 'DL14', 'LC1', 'HEIGHT ADJUSTABLE', 'FIXED HEIGHT', 'COLUMN'];
    
    for (const pattern of legPatterns) {
      console.log(`\n📌 Searching for assemblies containing "${pattern}":`);
      console.log('═══════════════════════════════════════════════════════════════');
      
      const assemblies = await prisma.assembly.findMany({
        where: {
          OR: [
            { name: { contains: pattern, mode: 'insensitive' } },
            { assemblyId: { contains: pattern, mode: 'insensitive' } }
          ]
        },
        select: {
          assemblyId: true,
          name: true,
          categoryCode: true,
          subcategoryCode: true
        },
        take: 10
      });
      
      if (assemblies.length === 0) {
        console.log('   No assemblies found');
      } else {
        assemblies.forEach(asm => {
          console.log(`   ${asm.assemblyId}`);
          console.log(`   Name: ${asm.name}`);
          console.log(`   Category: ${asm.categoryCode || 'N/A'} | Subcategory: ${asm.subcategoryCode || 'N/A'}`);
          console.log('   ---');
        });
      }
    }
    
    // Also check specific category codes that might contain legs
    console.log('\n\n📊 Checking category 721 (SINK BODY) assemblies:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const category721 = await prisma.assembly.findMany({
      where: {
        categoryCode: '721'
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true
      }
    });
    
    console.log(`Found ${category721.length} assemblies in category 721`);
    if (category721.length > 0) {
      // Group by subcategory
      const bySubcategory = {};
      category721.forEach(asm => {
        const sub = asm.subcategoryCode || 'No subcategory';
        if (!bySubcategory[sub]) bySubcategory[sub] = [];
        bySubcategory[sub].push(asm);
      });
      
      Object.entries(bySubcategory).forEach(([sub, items]) => {
        console.log(`\nSubcategory ${sub}: ${items.length} items`);
        items.slice(0, 5).forEach(asm => {
          console.log(`  - ${asm.assemblyId}: ${asm.name}`);
        });
        if (items.length > 5) console.log(`  ... and ${items.length - 5} more`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findLegAssemblies();