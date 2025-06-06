const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyPegboardKits() {
  try {
    // Count total pegboard kits (correct pattern from generation script)
    const pegboardKits = await prisma.assembly.findMany({
      where: {
        assemblyId: {
          contains: '-KIT'
        },
        AND: {
          assemblyId: {
            startsWith: 'T2-ADW-PB-'
          }
        }
      },
      include: {
        components: {
          include: {
            childPart: true,
            childAssembly: true
          }
        }
      },
      orderBy: {
        assemblyId: 'asc'
      }
    });

    console.log(`\n=== PEGBOARD KIT VERIFICATION ===`);
    console.log(`Total pegboard kits found: ${pegboardKits.length}`);

    // Show first 5 examples with details
    console.log(`\n=== SAMPLE PEGBOARD KITS (First 5) ===`);
    for (let i = 0; i < Math.min(5, pegboardKits.length); i++) {
      const kit = pegboardKits[i];
      console.log(`\n${i + 1}. ${kit.assemblyId} - ${kit.name}`);
      console.log(`   Components:`);
      kit.components.forEach(comp => {
        if (comp.childPart) {
          console.log(`   - ${comp.childPart.partId}: ${comp.childPart.name} (Qty: ${comp.quantity})`);
        } else if (comp.childAssembly) {
          console.log(`   - ${comp.childAssembly.assemblyId}: ${comp.childAssembly.name} (Qty: ${comp.quantity})`);
        } else {
          console.log(`   - Unknown component (Qty: ${comp.quantity})`);
        }
      });
    }

    // Verify all expected combinations exist (based on actual generation pattern)
    const sizes = ['3436', '4836', '6036', '7236', '8436', '9636', '10836', '12036'];
    const types = ['PERF', 'SOLID'];
    const colors = ['GREEN', 'BLACK', 'YELLOW', 'GREY', 'RED', 'BLUE', 'ORANGE', 'WHITE'];

    console.log(`\n=== CHECKING ALL COMBINATIONS ===`);
    console.log(`Expected pattern: T2-ADW-PB-{size}-{color}-{type}-KIT`);
    console.log(`Sizes: ${sizes.length}, Types: ${types.length}, Colors: ${colors.length}`);
    console.log(`Total expected: ${sizes.length * types.length * colors.length} combinations`);
    
    let missingKits = [];
    let foundKits = 0;

    for (const size of sizes) {
      for (const type of types) {
        for (const color of colors) {
          const kitId = `T2-ADW-PB-${size}-${color}-${type}-KIT`;
          const exists = pegboardKits.some(kit => kit.assemblyId === kitId);
          if (exists) {
            foundKits++;
          } else {
            missingKits.push(kitId);
          }
        }
      }
    }

    console.log(`Found ${foundKits} out of ${sizes.length * types.length * colors.length} expected combinations`);
    
    if (missingKits.length > 0) {
      console.log(`\nMissing kits (first 10):`);
      missingKits.slice(0, 10).forEach(kitId => console.log(`- ${kitId}`));
      if (missingKits.length > 10) {
        console.log(`... and ${missingKits.length - 10} more`);
      }
    } else {
      console.log(`\n✅ All 128 pegboard kit combinations are present!`);
    }

    // Verify component structure
    console.log(`\n=== COMPONENT STRUCTURE VERIFICATION ===`);
    const sampleKitWithComponents = pegboardKits.find(kit => kit.components.length > 0);
    if (sampleKitWithComponents) {
      const expectedComponents = ['T2-ADW-PB-', '22MP20026', '708.77']; // Based on generation script
      const actualComponents = sampleKitWithComponents.components.map(c => 
        c.childPart ? c.childPart.partId : 
        c.childAssembly ? c.childAssembly.assemblyId : 
        'Unknown'
      );
      
      console.log(`Sample kit ${sampleKitWithComponents.assemblyId} has ${actualComponents.length} components`);
      console.log(`Components: ${actualComponents.join(', ')}`);
      
      const hasExpectedStructure = 
        actualComponents.some(comp => comp.startsWith('T2-ADW-PB-')) &&
        actualComponents.includes('22MP20026') &&
        actualComponents.includes('708.77');
      
      if (hasExpectedStructure) {
        console.log(`✅ Component structure looks correct`);
      } else {
        console.log(`❌ Component structure may be incomplete`);
        console.log(`Expected components: pegboard (T2-ADW-PB-*), grommet (22MP20026), color component (708.77)`);
      }
    } else {
      console.log(`No kits found with components for verification`);
    }

  } catch (error) {
    console.error('Error verifying pegboard kits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPegboardKits();