const fs = require('fs').promises;
const path = require('path');

async function updateAssyVariants() {
  console.log('\n🔄 UPDATING ASSY- PREFIX CONTROL BOX VARIANTS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // 1. Load the update instructions
    const updatePath = path.join(__dirname, '../assy-variants-to-update.json');
    const updateData = JSON.parse(await fs.readFile(updatePath, 'utf-8'));
    const variantsToUpdate = updateData.variantsToUpdate;
    
    console.log('📦 Loaded update instructions');
    console.log(`   ASSY- variants to update: ${variantsToUpdate.length}`);
    
    // 2. Load assemblies.json
    const assembliesPath = path.join(__dirname, '../resources/assemblies.json');
    const assembliesData = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    
    console.log(`📋 Loaded assemblies.json`);
    
    // 3. Create another backup (incremental)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `../resources/assemblies.json.backup-${timestamp}`);
    await fs.writeFile(backupPath, JSON.stringify(assembliesData, null, 2));
    console.log(`💾 Created incremental backup: ${backupPath}`);
    
    // 4. Update ASSY- variants
    console.log('\n🔧 UPDATING ASSY- VARIANTS:');
    console.log('───────────────────────────────────────────────────────────');
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const variant of variantsToUpdate) {
      const assemblyId = variant.assemblyId;
      const components = variant.components;
      
      if (assembliesData.assemblies[assemblyId]) {
        const assembly = assembliesData.assemblies[assemblyId];
        const previousComponentCount = assembly.components ? assembly.components.length : 0;
        
        // Update with components
        assembly.components = components;
        
        console.log(`✅ ${assemblyId}:`);
        console.log(`   Previous components: ${previousComponentCount}`);
        console.log(`   New components: ${components.length}`);
        console.log(`   Total parts: ${components.reduce((sum, comp) => sum + comp.quantity, 0)}`);
        console.log(`   Source: ${variant.hardcodedId}`);
        
        updatedCount++;
      } else {
        console.log(`❌ ${assemblyId}: Assembly not found`);
        errorCount++;
      }
    }
    
    // 5. Update metadata
    assembliesData.metadata.last_updated = new Date().toISOString();
    assembliesData.metadata.assy_migration_notes = `Updated ${updatedCount} ASSY- prefix control box variants with components`;
    
    // 6. Save updated assemblies.json
    await fs.writeFile(assembliesPath, JSON.stringify(assembliesData, null, 2));
    
    console.log('\n📊 UPDATE SUMMARY:');
    console.log(`   ✅ Successfully updated: ${updatedCount} ASSY- variants`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   💾 Updated: ${assembliesPath}`);
    console.log(`   🔒 Backup: ${backupPath}`);
    
    // 7. Validate updates
    console.log('\n🔍 VALIDATING UPDATES:');
    console.log('───────────────────────────────────────────────────────────');
    
    const updatedAssemblies = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    let validationIssues = 0;
    
    for (const variant of variantsToUpdate) {
      const assemblyId = variant.assemblyId;
      const expectedComponents = variant.components;
      const assembly = updatedAssemblies.assemblies[assemblyId];
      
      if (assembly) {
        const actualComponents = assembly.components || [];
        
        if (actualComponents.length !== expectedComponents.length) {
          console.log(`❌ ${assemblyId}: Component count mismatch`);
          validationIssues++;
        } else {
          console.log(`✅ ${assemblyId}: ${actualComponents.length} components correctly updated`);
        }
      } else {
        console.log(`❌ ${assemblyId}: Assembly not found during validation`);
        validationIssues++;
      }
    }
    
    if (validationIssues === 0) {
      console.log('\n🎉 ASSY- VARIANT UPDATE SUCCESSFUL!');
    } else {
      console.log(`\n⚠️  VALIDATION ISSUES: ${validationIssues} problems found`);
    }
    
    // 8. Final control box status
    console.log('\n📋 FINAL CONTROL BOX STATUS:');
    console.log('───────────────────────────────────────────────────────────');
    
    const allControlBoxes = {};
    for (const [assemblyId, assemblyData] of Object.entries(updatedAssemblies.assemblies)) {
      if (assemblyId.includes('CTRL') || assemblyId.toLowerCase().includes('control')) {
        const componentCount = assemblyData.components ? assemblyData.components.length : 0;
        allControlBoxes[assemblyId] = componentCount;
      }
    }
    
    for (const [assemblyId, componentCount] of Object.entries(allControlBoxes)) {
      const status = componentCount > 0 ? '✅' : '❌';
      console.log(`   ${status} ${assemblyId}: ${componentCount} components`);
    }
    
    const totalControlBoxes = Object.keys(allControlBoxes).length;
    const controlBoxesWithComponents = Object.values(allControlBoxes).filter(count => count > 0).length;
    const controlBoxesWithoutComponents = totalControlBoxes - controlBoxesWithComponents;
    
    console.log('\n📊 FINAL STATISTICS:');
    console.log(`   Total control boxes: ${totalControlBoxes}`);
    console.log(`   ✅ With components: ${controlBoxesWithComponents}`);
    console.log(`   ❌ Without components: ${controlBoxesWithoutComponents}`);
    console.log(`   📈 Component coverage: ${((controlBoxesWithComponents / totalControlBoxes) * 100).toFixed(1)}%`);
    
    // 9. Generate final report
    const finalReport = {
      timestamp: new Date().toISOString(),
      updatedVariants: updatedCount,
      errors: errorCount,
      validationIssues: validationIssues,
      totalControlBoxes: totalControlBoxes,
      controlBoxesWithComponents: controlBoxesWithComponents,
      componentCoveragePercent: ((controlBoxesWithComponents / totalControlBoxes) * 100).toFixed(1),
      backupLocation: backupPath
    };
    
    const reportPath = path.join(__dirname, '../assy-variants-update-report.json');
    await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
    
    console.log(`\n📄 Final report saved: ${reportPath}`);
    
    return finalReport;
    
  } catch (error) {
    console.error('❌ ASSY- variant update failed:', error.message);
    throw error;
  }
}

// Run the update
if (require.main === module) {
  updateAssyVariants()
    .then((report) => {
      console.log('\n✅ ASSY- variant update completed!');
      console.log(`📊 Updated ${report.updatedVariants} assemblies`);
      console.log(`🎯 Control box component coverage: ${report.componentCoveragePercent}%`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAssyVariants };