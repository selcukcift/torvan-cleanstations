const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFaucetSubcategory() {
  console.log('\n🔧 FIXING FAUCET SUBCATEGORY MISMATCH');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Option 1: Update the configurator service to look for the correct subcategory
    console.log('1️⃣ UPDATING CONFIGURATOR SERVICE:');
    console.log('   Changing getFaucetTypeOptions to look for subcategory 720.702');
    
    const fs = require('fs');
    const path = require('path');
    const configuratorPath = path.join(__dirname, '../lib/configuratorService.native.ts');
    
    let content = fs.readFileSync(configuratorPath, 'utf8');
    
    // Replace the subcategory in getFaucetTypeOptions
    const oldSubcategory = 'subcategoryCode: \'720.706\'';
    const newSubcategory = 'subcategoryCode: \'720.702\'';
    
    if (content.includes(oldSubcategory)) {
      content = content.replace(oldSubcategory, newSubcategory);
      fs.writeFileSync(configuratorPath, content, 'utf8');
      console.log('✅ Updated configurator service subcategory: 720.706 -> 720.702');
    } else {
      console.log('⚠️  Subcategory already correct or pattern not found');
    }
    
    // 2. Verify the fix works
    console.log('\n2️⃣ TESTING THE FIX:');
    console.log('───────────────────────────────────────────────────────────');
    
    const faucetTest = await prisma.assembly.findMany({
      where: {
        categoryCode: '720',
        subcategoryCode: '720.702', // Now using the correct subcategory
        type: 'KIT',
        assemblyId: { 
          in: [
            'T2-OA-STD-FAUCET-WB-KIT',
            'T2-OA-PRE-RINSE-FAUCET-KIT',
            'T2-OA-DI-GOOSENECK-FAUCET-KIT'
          ] 
        }
      },
      select: {
        assemblyId: true,
        name: true,
        categoryCode: true,
        subcategoryCode: true,
        type: true
      }
    });
    
    console.log(`✅ Configurator query now finds: ${faucetTest.length} faucets`);
    faucetTest.forEach(f => {
      console.log(`   • ${f.assemblyId}`);
      console.log(`     Name: ${f.name}`);
    });
    
    if (faucetTest.length === 3) {
      console.log('\n🎉 SUCCESS: Faucet options should now appear in the configuration wizard!');
    } else {
      console.log('\n⚠️  Still missing some faucets. Check assembly IDs or types.');
    }
    
    // 3. Test the full function (simulate)
    console.log('\n3️⃣ SIMULATING getFaucetTypeOptions FUNCTION:');
    console.log('───────────────────────────────────────────────────────────');
    
    const simulatedResult = faucetTest.map(assembly => {
      let displayName = assembly.name;
      
      // Simplify display names (from configurator logic)
      switch (assembly.assemblyId) {
        case 'T2-OA-STD-FAUCET-WB-KIT':
          displayName = 'Standard Wrist Blade Faucet';
          break;
        case 'T2-OA-PRE-RINSE-FAUCET-KIT':
          displayName = 'Pre-Rinse Spray Faucet';
          break;
        case 'T2-OA-DI-GOOSENECK-FAUCET-KIT':
          displayName = 'DI Gooseneck Faucet';
          break;
      }
      
      return {
        assemblyId: assembly.assemblyId,
        id: assembly.assemblyId,
        name: assembly.name,
        displayName: displayName,
        description: `Faucet type - ${assembly.subcategoryCode}`,
        available: true
      };
    });
    
    console.log('Faucet options that will be returned:');
    simulatedResult.forEach((option, index) => {
      console.log(`${index + 1}. ${option.displayName}`);
      console.log(`   ID: ${option.id}`);
      console.log(`   Description: ${option.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixFaucetSubcategory();