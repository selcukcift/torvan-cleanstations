const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllConfigAssemblies() {
  console.log('\n🔍 SEARCHING FOR ALL CONFIGURATION ASSEMBLIES');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // 1. SINK MODELS
    console.log('1️⃣ SEARCHING FOR SINK MODELS');
    console.log('───────────────────────────────────────────────────────────');
    const sinkPatterns = ['BODY', 'INSTRO', 'SINK', 'BOWL'];
    for (const pattern of sinkPatterns) {
      const sinks = await prisma.assembly.findMany({
        where: {
          OR: [
            { assemblyId: { contains: pattern } },
            { name: { contains: pattern } }
          ],
          AND: [
            { 
              OR: [
                { name: { contains: 'HEIGHT ADJUSTABLE' } },
                { name: { contains: 'FIXED HEIGHT' } },
                { assemblyId: { contains: '-HA' } },
                { assemblyId: { contains: '-FH' } }
              ]
            }
          ]
        },
        select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true },
        take: 10
      });
      
      if (sinks.length > 0) {
        console.log(`\nPattern "${pattern}" found ${sinks.length} results:`);
        sinks.forEach(s => console.log(`  ${s.assemblyId} | Cat: ${s.categoryCode || 'null'}/${s.subcategoryCode || 'null'}`));
      }
    }
    
    // 2. BASIN TYPES
    console.log('\n\n2️⃣ SEARCHING FOR BASIN TYPES');
    console.log('───────────────────────────────────────────────────────────');
    const basinPatterns = ['BSN', 'BASIN', 'EDR', 'ESK'];
    for (const pattern of basinPatterns) {
      const basins = await prisma.assembly.findMany({
        where: {
          OR: [
            { assemblyId: { contains: pattern } },
            { name: { contains: pattern } }
          ],
          type: 'KIT'
        },
        select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true },
        take: 5
      });
      
      if (basins.length > 0) {
        console.log(`\nPattern "${pattern}" found ${basins.length} results:`);
        basins.forEach(b => console.log(`  ${b.assemblyId} | Cat: ${b.categoryCode || 'null'}/${b.subcategoryCode || 'null'}`));
      }
    }
    
    // 3. BASIN SIZES
    console.log('\n\n3️⃣ SEARCHING FOR BASIN SIZES');
    console.log('───────────────────────────────────────────────────────────');
    const basinSizes = await prisma.assembly.findMany({
      where: {
        OR: [
          { assemblyId: { contains: 'BASIN' } },
          { name: { contains: 'BASIN' } }
        ],
        AND: [
          { name: { contains: 'X' } } // Looking for dimension patterns like 20X20X8
        ]
      },
      select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true },
      take: 10
    });
    
    console.log(`Found ${basinSizes.length} basin size assemblies:`);
    basinSizes.forEach(b => console.log(`  ${b.assemblyId} | Cat: ${b.categoryCode || 'null'}/${b.subcategoryCode || 'null'}`));
    
    // 4. CONTROL BOXES
    console.log('\n\n4️⃣ SEARCHING FOR CONTROL BOXES');
    console.log('───────────────────────────────────────────────────────────');
    const controlBoxes = await prisma.assembly.findMany({
      where: {
        OR: [
          { assemblyId: { contains: 'CONTROL' } },
          { name: { contains: 'CONTROL' } },
          { assemblyId: { contains: 'CB3' } },
          { assemblyId: { contains: 'CB5' } }
        ]
      },
      select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true },
      take: 10
    });
    
    console.log(`Found ${controlBoxes.length} control box assemblies:`);
    controlBoxes.forEach(c => console.log(`  ${c.assemblyId} | Cat: ${c.categoryCode || 'null'}/${c.subcategoryCode || 'null'}`));
    
    // 5. PEGBOARDS
    console.log('\n\n5️⃣ SEARCHING FOR PEGBOARDS');
    console.log('───────────────────────────────────────────────────────────');
    const pegboards = await prisma.assembly.findMany({
      where: {
        OR: [
          { assemblyId: { contains: 'PEG' } },
          { name: { contains: 'PEGBOARD' } }
        ]
      },
      select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true },
      take: 10
    });
    
    console.log(`Found ${pegboards.length} pegboard assemblies:`);
    pegboards.forEach(p => console.log(`  ${p.assemblyId} | Cat: ${p.categoryCode || 'null'}/${p.subcategoryCode || 'null'}`));
    
    // 6. FAUCETS
    console.log('\n\n6️⃣ SEARCHING FOR FAUCETS');
    console.log('───────────────────────────────────────────────────────────');
    const faucets = await prisma.assembly.findMany({
      where: {
        OR: [
          { assemblyId: { contains: 'FAUCET' } },
          { name: { contains: 'FAUCET' } },
          { assemblyId: { contains: 'FCT' } }
        ]
      },
      select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true },
      take: 10
    });
    
    console.log(`Found ${faucets.length} faucet assemblies:`);
    faucets.forEach(f => console.log(`  ${f.assemblyId} | Cat: ${f.categoryCode || 'null'}/${f.subcategoryCode || 'null'}`));
    
    // 7. ACCESSORIES
    console.log('\n\n7️⃣ SEARCHING FOR ACCESSORIES');
    console.log('───────────────────────────────────────────────────────────');
    const accessories = await prisma.assembly.findMany({
      where: {
        isOrderable: true,
        OR: [
          { assemblyId: { contains: 'ACCESSORY' } },
          { name: { contains: 'ACCESSORY' } },
          { assemblyId: { contains: 'OA' } } // Optional Accessory
        ]
      },
      select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true },
      take: 10
    });
    
    console.log(`Found ${accessories.length} orderable accessories:`);
    accessories.forEach(a => console.log(`  ${a.assemblyId} | Cat: ${a.categoryCode || 'null'}/${a.subcategoryCode || 'null'}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findAllConfigAssemblies();