const fs = require('fs');
const path = require('path');

async function updateConfiguratorMappings() {
  console.log('\n🔧 UPDATING CONFIGURATOR SERVICE MAPPINGS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const configuratorPath = path.join(__dirname, '../lib/configuratorService.native.ts');
  
  try {
    let content = fs.readFileSync(configuratorPath, 'utf8');
    let changesMade = 0;
    
    // 1. UPDATE BASIN SIZE IDs (Add ASSY- prefix)
    console.log('1️⃣ Updating basin size assembly IDs...');
    const basinSizeUpdates = [
      { old: "'T2-ADW-BASIN20X20X8'", new: "'ASSY-T2-ADW-BASIN20X20X8'" },
      { old: "'T2-ADW-BASIN24X20X8'", new: "'ASSY-T2-ADW-BASIN24X20X8'" },
      { old: "'T2-ADW-BASIN24X20X10'", new: "'ASSY-T2-ADW-BASIN24X20X10'" },
      { old: "'T2-ADW-BASIN30X20X8'", new: "'ASSY-T2-ADW-BASIN30X20X8'" },
      { old: "'T2-ADW-BASIN30X20X10'", new: "'ASSY-T2-ADW-BASIN30X20X10'" }
    ];
    
    for (const update of basinSizeUpdates) {
      if (content.includes(update.old)) {
        content = content.replace(new RegExp(update.old, 'g'), update.new);
        console.log(`✅ Updated ${update.old} -> ${update.new}`);
        changesMade++;
      }
    }
    
    // 2. UPDATE PEGBOARD EXPECTED IDs
    console.log('\n2️⃣ Updating pegboard assembly IDs...');
    const pegboardUpdates = [
      { old: "'T2-PEG-EG2-BLACK'", new: "'ASSY-T2-ADW-PB-3436'" },
      { old: "'T2-PEG-EG2-YELLOW'", new: "'ASSY-T2-ADW-PB-4836'" },
      { old: "'T2-PEG-EG2-GREY'", new: "'ASSY-T2-ADW-PB-6036'" }
    ];
    
    for (const update of pegboardUpdates) {
      if (content.includes(update.old)) {
        content = content.replace(new RegExp(update.old, 'g'), update.new);
        console.log(`✅ Updated ${update.old} -> ${update.new}`);
        changesMade++;
      }
    }
    
    // 3. UPDATE SINK MODEL CATEGORY CODES
    console.log('\n3️⃣ Updating sink model category mappings...');
    
    // Update getSinkModels function to use correct subcategories
    const sinkModelUpdate = `    const sinkAssemblies = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: { in: ['721.71', '721.72', '721.73', '721.74'] },
        assemblyId: { 
          in: [
            'T2-BODY-48-60-HA', 'T2-BODY-61-72-HA', 'T2-BODY-73-120-HA',
            'T2-1B-INSTRO-HA'
          ] 
        }
      },`;
    
    // Find and replace the existing getSinkModels query
    const sinkModelRegex = /const sinkAssemblies = await prisma\.assembly\.findMany\(\{[^}]+where: \{[^}]+\},/s;
    if (sinkModelRegex.test(content)) {
      content = content.replace(sinkModelRegex, sinkModelUpdate);
      console.log(`✅ Updated sink models query`);
      changesMade++;
    }
    
    // 4. UPDATE CONTROL BOX CATEGORY
    console.log('\n4️⃣ Updating control box category...');
    const controlBoxUpdate = `        categoryCode: '718',
        subcategoryCode: '718.72'`;
    
    const controlBoxRegex = /categoryCode: '718'[^}]*subcategoryCode: '[^']*'/;
    if (controlBoxRegex.test(content)) {
      content = content.replace(controlBoxRegex, controlBoxUpdate);
      console.log(`✅ Updated control box category mapping`);
      changesMade++;
    }
    
    // Write the updated content back to the file
    if (changesMade > 0) {
      fs.writeFileSync(configuratorPath, content, 'utf8');
      console.log(`\n✅ Successfully updated configurator service with ${changesMade} changes`);
    } else {
      console.log('\n⚠️  No changes were needed in the configurator service');
    }
    
    console.log('\n📝 Note: You may need to manually review and update any hardcoded');
    console.log('assembly IDs in the configurator service that weren\'t automatically updated.');
    
  } catch (error) {
    console.error('❌ Error updating configurator service:', error.message);
  }
}

updateConfiguratorMappings();