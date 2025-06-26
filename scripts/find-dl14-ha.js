const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDL14HA() {
  try {
    console.log('\n🔍 Searching for DL14 Height Adjustable assembly...\n');
    
    const dl14Assemblies = await prisma.assembly.findMany({
      where: {
        OR: [
          { assemblyId: { contains: 'DL14', mode: 'insensitive' } },
          { name: { contains: 'DL14', mode: 'insensitive' } }
        ],
        NOT: {
          assemblyId: { contains: '-FH-' }
        }
      },
      select: {
        assemblyId: true,
        name: true,
        categoryCode: true,
        subcategoryCode: true
      }
    });
    
    console.log(`Found ${dl14Assemblies.length} DL14 assemblies (non-fixed height):\n`);
    
    dl14Assemblies.forEach(asm => {
      console.log(`Assembly ID: ${asm.assemblyId}`);
      console.log(`Name: ${asm.name}`);
      console.log(`Category: ${asm.categoryCode || 'N/A'} | Subcategory: ${asm.subcategoryCode || 'N/A'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findDL14HA();