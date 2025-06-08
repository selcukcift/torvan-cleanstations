const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findBasinAssemblies() {
  try {
    console.log('Searching for basin-related assemblies...\n');

    // Query for assemblies matching the criteria
    const basinAssemblies = await prisma.assembly.findMany({
      where: {
        AND: [
          {
            OR: [
              { categoryCode: '722' },
              { subcategoryCode: '722.713' }
            ]
          },
          {
            OR: [
              { name: { contains: 'BASIN', mode: 'insensitive' } },
              { name: { contains: 'BSN', mode: 'insensitive' } },
              { name: { contains: 'EDR', mode: 'insensitive' } },
              { name: { contains: 'ESK', mode: 'insensitive' } },
              { name: { contains: 'DRAIN', mode: 'insensitive' } },
              { name: { contains: 'ESINK', mode: 'insensitive' } },
              { name: { contains: 'E-SINK', mode: 'insensitive' } }
            ]
          },
          { type: 'KIT' }
        ]
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        assemblyId: true,
        name: true,
        subcategoryCode: true,
        categoryCode: true
      }
    });

    console.log(`Found ${basinAssemblies.length} basin-related assemblies:\n`);

    // Display results in a formatted table
    console.log('Assembly ID'.padEnd(30) + 'Name'.padEnd(50) + 'Category Code'.padEnd(15) + 'Subcategory Code');
    console.log('-'.repeat(110));

    basinAssemblies.forEach(assembly => {
      console.log(
        assembly.assemblyId.padEnd(30) +
        assembly.name.padEnd(50) +
        (assembly.categoryCode || '').padEnd(15) +
        (assembly.subcategoryCode || '')
      );
    });

    // Group by subcategory for summary
    console.log('\n\nSummary by Subcategory:');
    console.log('-'.repeat(50));
    
    const subcategoryGroups = basinAssemblies.reduce((acc, assembly) => {
      const key = assembly.subcategoryCode || 'No subcategory';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(assembly);
      return acc;
    }, {});

    Object.entries(subcategoryGroups).forEach(([subcategory, assemblies]) => {
      console.log(`\n${subcategory}: ${assemblies.length} assemblies`);
      assemblies.forEach(assembly => {
        console.log(`  - ${assembly.assemblyId}: ${assembly.name}`);
      });
    });

    // Also search for assemblies that might be basin-related but don't match all criteria
    console.log('\n\nAdditional assemblies that might be basin-related (matching name patterns but not all criteria):');
    console.log('-'.repeat(80));

    const additionalAssemblies = await prisma.assembly.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: 'BASIN', mode: 'insensitive' } },
              { name: { contains: 'BSN', mode: 'insensitive' } },
              { name: { contains: 'EDR', mode: 'insensitive' } },
              { name: { contains: 'ESK', mode: 'insensitive' } },
              { name: { contains: 'DRAIN', mode: 'insensitive' } },
              { name: { contains: 'ESINK', mode: 'insensitive' } },
              { name: { contains: 'E-SINK', mode: 'insensitive' } }
            ]
          },
          {
            NOT: {
              AND: [
                {
                  OR: [
                    { categoryCode: '722' },
                    { subcategoryCode: '722.713' }
                  ]
                },
                { type: 'KIT' }
              ]
            }
          }
        ]
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        assemblyId: true,
        name: true,
        type: true,
        categoryCode: true,
        subcategoryCode: true
      }
    });

    console.log(`\nFound ${additionalAssemblies.length} additional assemblies with basin-related names:\n`);
    
    additionalAssemblies.forEach(assembly => {
      console.log(
        `${assembly.assemblyId.padEnd(30)} ${assembly.name.padEnd(40)} Type: ${(assembly.type || 'N/A').padEnd(10)} Category: ${assembly.categoryCode || 'N/A'} / ${assembly.subcategoryCode || 'N/A'}`
      );
    });

  } catch (error) {
    console.error('Error finding basin assemblies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
findBasinAssemblies();