const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findFeetAssemblies() {
  try {
    console.log('\n🦶 Searching for Feet Type Assemblies in Database...\n');
    
    // Search patterns for feet
    const feetPatterns = ['FEET', 'FOOT', 'LEVELING', 'CASTER', 'GLIDE', 'PAD'];
    
    for (const pattern of feetPatterns) {
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
    
    // Also check for specific patterns that might be feet
    console.log('\n\n📌 Searching for T2 feet/caster assemblies:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const t2Feet = await prisma.assembly.findMany({
      where: {
        assemblyId: { startsWith: 'ASSY-T2', mode: 'insensitive' },
        OR: [
          { name: { contains: 'FEET', mode: 'insensitive' } },
          { name: { contains: 'CASTER', mode: 'insensitive' } },
          { name: { contains: 'LEVELING', mode: 'insensitive' } },
          { name: { contains: 'GLIDE', mode: 'insensitive' } }
        ]
      },
      select: {
        assemblyId: true,
        name: true,
        categoryCode: true,
        subcategoryCode: true
      }
    });
    
    console.log(`Found ${t2Feet.length} T2 feet/caster assemblies`);
    t2Feet.forEach(asm => {
      console.log(`\n   ${asm.assemblyId}`);
      console.log(`   Name: ${asm.name}`);
      console.log(`   Category: ${asm.categoryCode || 'N/A'} | Subcategory: ${asm.subcategoryCode || 'N/A'}`);
    });
    
    // Check what's in category 721.712 (likely feet subcategory)
    console.log('\n\n📊 Checking subcategory 721.712 (potential feet category):');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const cat721712 = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: '721.712'
      },
      select: {
        assemblyId: true,
        name: true
      }
    });
    
    console.log(`Found ${cat721712.length} assemblies in 721.712`);
    cat721712.forEach(asm => {
      console.log(`  - ${asm.assemblyId}: ${asm.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findFeetAssemblies();