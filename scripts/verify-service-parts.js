const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function verifyServiceParts() {
  console.log('🔍 Verifying Service Parts Configuration...\n');
  
  try {
    // Load categories data
    const categoriesData = JSON.parse(
      await fs.readFile(path.join(__dirname, '../resources/categories.json'), 'utf-8')
    );
    
    // Get service parts category (719)
    const servicePartsCategory = categoriesData.categories['719'];
    if (!servicePartsCategory) {
      console.error('❌ Service Parts category (719) not found in categories.json');
      return;
    }
    
    console.log(`✅ Found Service Parts category: ${servicePartsCategory.name}`);
    console.log(`📋 Total subcategories: ${Object.keys(servicePartsCategory.subcategories).length}\n`);
    
    // Check if category exists in database
    const dbCategory = await prisma.category.findUnique({
      where: { categoryId: '719' },
      include: {
        subcategories: {
          include: {
            assemblies: true
          }
        }
      }
    });
    
    if (!dbCategory) {
      console.error('❌ Service Parts category (719) not found in database');
      console.log('💡 Run database seeding scripts first');
      return;
    }
    
    // Verify each subcategory and its assemblies
    let totalMissing = 0;
    let totalFound = 0;
    
    for (const [subcatId, subcatData] of Object.entries(servicePartsCategory.subcategories)) {
      console.log(`\n📁 ${subcatData.name} (${subcatId}):`);
      
      // Check if subcategory exists in DB
      const dbSubcat = dbCategory.subcategories.find(s => s.subcategoryId === subcatId);
      if (!dbSubcat) {
        console.log(`  ⚠️  Subcategory not in database`);
        continue;
      }
      
      // Check each assembly reference
      for (const assemblyRef of subcatData.assembly_refs) {
        const assembly = await prisma.assembly.findUnique({
          where: { assemblyId: assemblyRef }
        });
        
        if (assembly) {
          console.log(`  ✅ ${assemblyRef} - ${assembly.name}`);
          totalFound++;
        } else {
          console.log(`  ❌ ${assemblyRef} - NOT FOUND in assemblies table`);
          totalMissing++;
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Assemblies found: ${totalFound}`);
    console.log(`❌ Assemblies missing: ${totalMissing}`);
    console.log(`📋 Total assemblies checked: ${totalFound + totalMissing}`);
    
    if (totalMissing > 0) {
      console.log('\n⚠️  Some assemblies are missing from the database.');
      console.log('💡 These may need to be added to assemblies.json and re-seeded.');
    } else {
      console.log('\n🎉 All service parts assemblies are properly configured!');
    }
    
    // Test the service parts hierarchy API
    console.log('\n🌐 Testing Service Parts Hierarchy API...');
    const servicePartsInDb = await prisma.category.findUnique({
      where: { categoryId: '719' },
      select: {
        categoryId: true,
        name: true,
        subcategories: {
          select: {
            subcategoryId: true,
            name: true,
            assemblies: {
              where: { categoryCode: '719' },
              select: {
                assemblyId: true,
                name: true,
                type: true,
                components: {
                  include: {
                    childPart: true,
                    childAssembly: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (servicePartsInDb && servicePartsInDb.subcategories.length > 0) {
      console.log('✅ Service Parts hierarchy is accessible via API');
      console.log(`   Found ${servicePartsInDb.subcategories.length} subcategories`);
      const totalAssemblies = servicePartsInDb.subcategories.reduce(
        (sum, sub) => sum + sub.assemblies.length, 0
      );
      console.log(`   Total assemblies in hierarchy: ${totalAssemblies}`);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyServiceParts().catch(console.error);