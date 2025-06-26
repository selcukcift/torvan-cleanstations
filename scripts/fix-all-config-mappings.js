const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllConfigMappings() {
  console.log('\n🔧 FIXING ALL CONFIGURATION MAPPINGS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  let totalFixed = 0;
  
  try {
    // 1. FIX SINK MODELS (Category: 721, Subcategory: based on type)
    console.log('1️⃣ FIXING SINK MODELS');
    console.log('───────────────────────────────────────────────────────────');
    const sinkMappings = [
      { id: 'T2-BODY-48-60-HA', category: '721', subcategory: '721.71' }, // Double bowl HA
      { id: 'T2-BODY-61-72-HA', category: '721', subcategory: '721.72' }, // Double bowl HA
      { id: 'T2-BODY-73-120-HA', category: '721', subcategory: '721.73' }, // Triple bowl HA
      { id: 'T2-1B-INSTRO-HA', category: '721', subcategory: '721.74' }   // Single bowl HA
    ];
    
    for (const mapping of sinkMappings) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: mapping.id },
          data: { 
            categoryCode: mapping.category,
            subcategoryCode: mapping.subcategory
          }
        });
        console.log(`✅ Updated ${mapping.id} -> ${mapping.category}/${mapping.subcategory}`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to update ${mapping.id}: ${error.message}`);
      }
    }
    
    // 2. FIX BASIN TYPES (Category: 722, Subcategory: 722.713)
    console.log('\n2️⃣ FIXING BASIN TYPES');
    console.log('───────────────────────────────────────────────────────────');
    const basinTypeMappings = [
      { id: 'T2-BSN-EDR-KIT', category: '722', subcategory: '722.713' },
      { id: 'T2-BSN-ESK-KIT', category: '722', subcategory: '722.713' },
      { id: 'T2-BSN-ESK-DI-KIT', category: '722', subcategory: '722.713' }
    ];
    
    for (const mapping of basinTypeMappings) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: mapping.id },
          data: { 
            categoryCode: mapping.category,
            subcategoryCode: mapping.subcategory
          }
        });
        console.log(`✅ Updated ${mapping.id} -> ${mapping.category}/${mapping.subcategory}`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to update ${mapping.id}: ${error.message}`);
      }
    }
    
    // 3. FIX BASIN SIZES (Category: 722, Subcategory: 722.712)
    console.log('\n3️⃣ FIXING BASIN SIZES');
    console.log('───────────────────────────────────────────────────────────');
    const basinSizeMappings = [
      { id: 'ASSY-T2-ADW-BASIN20X20X8', category: '722', subcategory: '722.712' },
      { id: 'ASSY-T2-ADW-BASIN24X20X8', category: '722', subcategory: '722.712' },
      { id: 'ASSY-T2-ADW-BASIN24X20X10', category: '722', subcategory: '722.712' },
      { id: 'ASSY-T2-ADW-BASIN30X20X8', category: '722', subcategory: '722.712' },
      { id: 'ASSY-T2-ADW-BASIN30X20X10', category: '722', subcategory: '722.712' }
    ];
    
    for (const mapping of basinSizeMappings) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: mapping.id },
          data: { 
            categoryCode: mapping.category,
            subcategoryCode: mapping.subcategory
          }
        });
        console.log(`✅ Updated ${mapping.id} -> ${mapping.category}/${mapping.subcategory}`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to update ${mapping.id}: ${error.message}`);
      }
    }
    
    // 4. FIX CONTROL BOXES (Category: 718, Subcategory: 718.72)
    console.log('\n4️⃣ FIXING CONTROL BOXES');
    console.log('───────────────────────────────────────────────────────────');
    const controlBoxMappings = [
      { id: 'ASSY-T2-CTRL-EDR2', category: '718', subcategory: '718.72' },
      { id: 'ASSY-T2-CTRL-EDR3', category: '718', subcategory: '718.72' },
      { id: 'ASSY-T2-CTRL-ESK2', category: '718', subcategory: '718.72' },
      { id: 'ASSY-T2-CTRL-ESK3', category: '718', subcategory: '718.72' },
      { id: 'T2-CTRL-EDR1', category: '718', subcategory: '718.72' },
      { id: 'T2-CTRL-EDR1-ESK1', category: '718', subcategory: '718.72' }
    ];
    
    for (const mapping of controlBoxMappings) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: mapping.id },
          data: { 
            categoryCode: mapping.category,
            subcategoryCode: mapping.subcategory
          }
        });
        console.log(`✅ Updated ${mapping.id} -> ${mapping.category}/${mapping.subcategory}`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to update ${mapping.id}: ${error.message}`);
      }
    }
    
    // 5. FIX PEGBOARDS (Category: 723, Subcategory: 723.01)
    console.log('\n5️⃣ FIXING PEGBOARDS');
    console.log('───────────────────────────────────────────────────────────');
    const pegboardMappings = [
      { id: 'ASSY-T2-ADW-PB-3436', category: '723', subcategory: '723.01' },
      { id: 'ASSY-T2-ADW-PB-4836', category: '723', subcategory: '723.01' },
      { id: 'ASSY-T2-ADW-PB-6036', category: '723', subcategory: '723.01' },
      { id: 'ASSY-T2-ADW-PB-7236', category: '723', subcategory: '723.01' },
      { id: 'ASSY-T2-ADW-PB-8436', category: '723', subcategory: '723.01' },
      { id: 'ASSY-T2-ADW-PB-9636', category: '723', subcategory: '723.01' },
      { id: 'ASSY-T2-ADW-PB-10836', category: '723', subcategory: '723.01' },
      { id: 'ASSY-T2-ADW-PB-12036', category: '723', subcategory: '723.01' }
    ];
    
    for (const mapping of pegboardMappings) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: mapping.id },
          data: { 
            categoryCode: mapping.category,
            subcategoryCode: mapping.subcategory
          }
        });
        console.log(`✅ Updated ${mapping.id} -> ${mapping.category}/${mapping.subcategory}`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to update ${mapping.id}: ${error.message}`);
      }
    }
    
    // 6. FIX FAUCETS (Category: 720, Subcategory: 720.702)
    console.log('\n6️⃣ FIXING FAUCETS');
    console.log('───────────────────────────────────────────────────────────');
    const faucetMappings = [
      { id: 'ASSY-B-0133-A10-B08', category: '720', subcategory: '720.702' },
      { id: 'ASSY-B-2342-WB', category: '720', subcategory: '720.702' },
      { id: 'T2-OA-DI-GOOSENECK-FAUCET-KIT', category: '720', subcategory: '720.702' },
      { id: 'T2-OA-PRE-RINSE-FAUCET-KIT', category: '720', subcategory: '720.702' },
      { id: 'T2-OA-STD-FAUCET-WB-KIT', category: '720', subcategory: '720.702' }
    ];
    
    for (const mapping of faucetMappings) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: mapping.id },
          data: { 
            categoryCode: mapping.category,
            subcategoryCode: mapping.subcategory
          }
        });
        console.log(`✅ Updated ${mapping.id} -> ${mapping.category}/${mapping.subcategory}`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to update ${mapping.id}: ${error.message}`);
      }
    }
    
    // 7. FIX BASIN ADD-ONS (Category: 706, Various subcategories)
    console.log('\n7️⃣ FIXING BASIN ADD-ONS');
    console.log('───────────────────────────────────────────────────────────');
    const basinAddonMappings = [
      { id: 'T2-OA-BASIN-LIGHT-EDR-KIT', category: '706', subcategory: '706.65' },
      { id: 'T2-OA-BASIN-LIGHT-ESK-KIT', category: '706', subcategory: '706.67' }
    ];
    
    for (const mapping of basinAddonMappings) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: mapping.id },
          data: { 
            categoryCode: mapping.category,
            subcategoryCode: mapping.subcategory
          }
        });
        console.log(`✅ Updated ${mapping.id} -> ${mapping.category}/${mapping.subcategory}`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to update ${mapping.id}: ${error.message}`);
      }
    }
    
    // 8. MARK ACCESSORIES AS ORDERABLE
    console.log('\n8️⃣ FIXING ACCESSORIES (Mark as orderable)');
    console.log('───────────────────────────────────────────────────────────');
    const accessoryIds = [
      'T2-OA-DI-GOOSENECK-FAUCET-KIT',
      'T2-OA-PRE-RINSE-FAUCET-KIT', 
      'T2-OA-STD-FAUCET-WB-KIT',
      'T2-OA-BASIN-LIGHT-EDR-KIT',
      'T2-OA-BASIN-LIGHT-ESK-KIT'
    ];
    
    for (const id of accessoryIds) {
      try {
        const updated = await prisma.assembly.update({
          where: { assemblyId: id },
          data: { isOrderable: true }
        });
        console.log(`✅ Marked ${id} as orderable`);
        totalFixed++;
      } catch (error) {
        console.log(`❌ Failed to mark ${id} as orderable: ${error.message}`);
      }
    }
    
    console.log('\n\n📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Total assemblies fixed: ${totalFixed}`);
    
    // Verification
    console.log('\n🔍 VERIFICATION:');
    
    const verifications = [
      { name: 'Sink Models', category: '721', subcategories: ['721.71', '721.72', '721.73', '721.74'] },
      { name: 'Basin Types', category: '722', subcategories: ['722.713'] },
      { name: 'Basin Sizes', category: '722', subcategories: ['722.712'] },
      { name: 'Control Boxes', category: '718', subcategories: ['718.72'] },
      { name: 'Pegboards', category: '723', subcategories: ['723.01'] },
      { name: 'Faucets', category: '720', subcategories: ['720.702'] },
      { name: 'Basin Add-ons', category: '706', subcategories: ['706.65', '706.67', '706.68'] }
    ];
    
    for (const verification of verifications) {
      const count = await prisma.assembly.count({
        where: {
          categoryCode: verification.category,
          subcategoryCode: { in: verification.subcategories }
        }
      });
      console.log(`${verification.name}: ${count} assemblies`);
    }
    
    console.log('\n🎉 Configuration mapping fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllConfigMappings();