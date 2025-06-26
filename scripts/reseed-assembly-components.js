const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function reseedAssemblyComponents() {
  console.log('\n🌱 RE-SEEDING ASSEMBLY COMPONENT RELATIONSHIPS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // 1. Load updated assemblies.json
    const assembliesPath = path.join(__dirname, '../resources/assemblies.json');
    const assembliesData = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    const assemblies = assembliesData.assemblies;
    
    console.log('📦 Loaded updated assemblies.json');
    console.log(`   Total assemblies: ${Object.keys(assemblies).length}`);
    
    // Count assemblies with components
    const assembliesWithComponents = Object.entries(assemblies).filter(([_, data]) => 
      data.components && data.components.length > 0
    );
    
    console.log(`   Assemblies with components: ${assembliesWithComponents.length}`);
    
    // 2. Check current database state
    console.log('\n🔍 CHECKING CURRENT DATABASE STATE:');
    console.log('───────────────────────────────────────────────────────────');
    
    const currentAssemblyCount = await prisma.assembly.count();
    const currentComponentCount = await prisma.assemblyComponent.count();
    
    console.log(`   Current assemblies in DB: ${currentAssemblyCount}`);
    console.log(`   Current component relationships: ${currentComponentCount}`);
    
    // Check control box component status
    const controlBoxes = await prisma.assembly.findMany({
      where: {
        assemblyId: { contains: 'CTRL' }
      },
      include: {
        components: true
      }
    });
    
    const controlBoxesWithComponents = controlBoxes.filter(cb => cb.components.length > 0);
    console.log(`   Control boxes in DB: ${controlBoxes.length}`);
    console.log(`   Control boxes with components: ${controlBoxesWithComponents.length}`);
    
    // 3. Identify components to seed
    console.log('\n📋 ANALYZING COMPONENTS TO SEED:');
    console.log('───────────────────────────────────────────────────────────');
    
    let totalComponentsToSeed = 0;
    const assembliesNeedingSeeding = [];
    
    for (const [assemblyId, assemblyData] of assembliesWithComponents) {
      if (assemblyData.components && assemblyData.components.length > 0) {
        // Check if assembly exists in DB
        const existsInDB = await prisma.assembly.findUnique({
          where: { assemblyId },
          include: { components: true }
        });
        
        if (existsInDB) {
          const currentDbComponents = existsInDB.components.length;
          const jsonComponents = assemblyData.components.length;
          
          if (currentDbComponents < jsonComponents) {
            assembliesNeedingSeeding.push({
              assemblyId,
              name: assemblyData.name,
              currentComponents: currentDbComponents,
              newComponents: jsonComponents,
              componentsToAdd: assemblyData.components
            });
            
            totalComponentsToSeed += (jsonComponents - currentDbComponents);
          }
        }
      }
    }
    
    console.log(`   Assemblies needing component seeding: ${assembliesNeedingSeeding.length}`);
    console.log(`   Total component relationships to add: ${totalComponentsToSeed}`);
    
    if (assembliesNeedingSeeding.length === 0) {
      console.log('\n✅ All assemblies already have complete component relationships!');
      return;
    }
    
    // 4. Show what will be seeded
    console.log('\n🔧 ASSEMBLIES TO UPDATE:');
    console.log('───────────────────────────────────────────────────────────');
    
    for (const assembly of assembliesNeedingSeeding.slice(0, 10)) { // Show first 10
      console.log(`   ${assembly.assemblyId}:`);
      console.log(`      Current: ${assembly.currentComponents} components`);
      console.log(`      Will add: ${assembly.newComponents - assembly.currentComponents} components`);
      console.log(`      Total after: ${assembly.newComponents} components`);
    }
    
    if (assembliesNeedingSeeding.length > 10) {
      console.log(`   ... and ${assembliesNeedingSeeding.length - 10} more assemblies`);
    }
    
    // 5. Seed component relationships
    console.log('\n🌱 SEEDING COMPONENT RELATIONSHIPS:');
    console.log('───────────────────────────────────────────────────────────');
    
    let seededCount = 0;
    let errorCount = 0;
    let componentsCreated = 0;
    
    for (const assembly of assembliesNeedingSeeding) {
      const assemblyId = assembly.assemblyId;
      const components = assembly.componentsToAdd;
      
      console.log(`\n🔧 Processing ${assemblyId}:`);
      
      // Delete existing components for this assembly to avoid duplicates
      const deletedComponents = await prisma.assemblyComponent.deleteMany({
        where: { parentAssemblyId: assemblyId }
      });
      
      console.log(`   Cleared ${deletedComponents.count} existing components`);
      
      let assemblyComponentsCreated = 0;
      
      for (const component of components) {
        try {
          // Validate part exists
          if (component.part_id) {
            const partExists = await prisma.part.findUnique({
              where: { partId: component.part_id }
            });
            
            if (!partExists) {
              console.log(`   ⚠️  Skipping ${component.part_id}: Part not found`);
              continue;
            }
          }
          
          // Validate assembly exists (for assembly components)
          if (component.assembly_id) {
            const assemblyExists = await prisma.assembly.findUnique({
              where: { assemblyId: component.assembly_id }
            });
            
            if (!assemblyExists) {
              console.log(`   ⚠️  Skipping ${component.assembly_id}: Assembly not found`);
              continue;
            }
          }
          
          // Create component relationship
          await prisma.assemblyComponent.create({
            data: {
              parentAssemblyId: assemblyId,
              childPartId: component.part_id || null,
              childAssemblyId: component.assembly_id || null,
              quantity: component.quantity || 1,
              notes: component.notes || null
            }
          });
          
          assemblyComponentsCreated++;
          componentsCreated++;
          
        } catch (error) {
          console.log(`   ❌ Error creating component ${component.part_id || component.assembly_id}: ${error.message}`);
          errorCount++;
        }
      }
      
      console.log(`   ✅ Created ${assemblyComponentsCreated} component relationships`);
      seededCount++;
    }
    
    // 6. Verification
    console.log('\n🔍 VERIFICATION:');
    console.log('───────────────────────────────────────────────────────────');
    
    const finalComponentCount = await prisma.assemblyComponent.count();
    const finalControlBoxes = await prisma.assembly.findMany({
      where: {
        assemblyId: { contains: 'CTRL' }
      },
      include: {
        components: true
      }
    });
    
    const finalControlBoxesWithComponents = finalControlBoxes.filter(cb => cb.components.length > 0);
    
    console.log(`   Final component relationships in DB: ${finalComponentCount}`);
    console.log(`   Component relationships added: ${finalComponentCount - currentComponentCount}`);
    console.log(`   Control boxes with components: ${finalControlBoxesWithComponents.length}/${finalControlBoxes.length}`);
    
    // Check specific control boxes
    console.log('\n🔧 CONTROL BOX VERIFICATION:');
    for (const controlBox of finalControlBoxes.slice(0, 5)) {
      console.log(`   ${controlBox.assemblyId}: ${controlBox.components.length} components`);
    }
    
    // 7. Generate seeding report
    const seedingReport = {
      timestamp: new Date().toISOString(),
      assembliesProcessed: seededCount,
      componentRelationshipsCreated: componentsCreated,
      errors: errorCount,
      beforeSeeding: {
        totalComponents: currentComponentCount,
        controlBoxesWithComponents: controlBoxesWithComponents.length
      },
      afterSeeding: {
        totalComponents: finalComponentCount,
        controlBoxesWithComponents: finalControlBoxesWithComponents.length
      },
      improvement: {
        componentsAdded: finalComponentCount - currentComponentCount,
        controlBoxesFixed: finalControlBoxesWithComponents.length - controlBoxesWithComponents.length
      }
    };
    
    const reportPath = path.join(__dirname, '../assembly-component-seeding-report.json');
    await fs.writeFile(reportPath, JSON.stringify(seedingReport, null, 2));
    
    console.log('\n📊 SEEDING SUMMARY:');
    console.log(`   ✅ Assemblies processed: ${seededCount}`);
    console.log(`   ✅ Component relationships created: ${componentsCreated}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total component relationships: ${currentComponentCount} → ${finalComponentCount}`);
    console.log(`   🎯 Control boxes with components: ${controlBoxesWithComponents.length} → ${finalControlBoxesWithComponents.length}`);
    
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    
    if (finalControlBoxesWithComponents.length === finalControlBoxes.length) {
      console.log('\n🎉 SUCCESS: All control boxes now have component relationships!');
    }
    
    return seedingReport;
    
  } catch (error) {
    console.error('❌ Re-seeding failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  reseedAssemblyComponents()
    .then((report) => {
      console.log('\n✅ Assembly component re-seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Re-seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { reseedAssemblyComponents };