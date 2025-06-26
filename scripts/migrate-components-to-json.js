const fs = require('fs').promises;
const path = require('path');

async function migrateComponentsToJSON() {
  console.log('\n🚚 MIGRATING HARDCODED COMPONENTS TO ASSEMBLIES.JSON');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // 1. Load extracted hardcoded components
    const extractedPath = path.join(__dirname, '../extracted-hardcoded-components.json');
    const extractedData = JSON.parse(await fs.readFile(extractedPath, 'utf-8'));
    const controlBoxComponents = extractedData.controlBoxComponents;
    
    console.log('📦 Loaded hardcoded components data');
    console.log(`   Control boxes to migrate: ${Object.keys(controlBoxComponents).length}`);
    
    // 2. Load current assemblies.json
    const assembliesPath = path.join(__dirname, '../resources/assemblies.json');
    const assembliesData = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    
    console.log(`📋 Loaded assemblies.json`);
    console.log(`   Total assemblies: ${Object.keys(assembliesData.assemblies).length}`);
    
    // 3. Create backup
    const backupPath = path.join(__dirname, '../resources/assemblies.json.backup');
    await fs.writeFile(backupPath, JSON.stringify(assembliesData, null, 2));
    console.log(`💾 Created backup: ${backupPath}`);
    
    // 4. Migrate components
    console.log('\n🔄 MIGRATING CONTROL BOX COMPONENTS:');
    console.log('───────────────────────────────────────────────────────────');
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const [controlBoxId, components] of Object.entries(controlBoxComponents)) {
      if (assembliesData.assemblies[controlBoxId]) {
        const assembly = assembliesData.assemblies[controlBoxId];
        const previousComponentCount = assembly.components ? assembly.components.length : 0;
        
        // Update the assembly with the component definitions
        assembly.components = components;
        
        console.log(`✅ ${controlBoxId}:`);
        console.log(`   Previous components: ${previousComponentCount}`);
        console.log(`   New components: ${components.length}`);
        console.log(`   Total parts: ${components.reduce((sum, comp) => sum + comp.quantity, 0)}`);
        
        migratedCount++;
      } else {
        console.log(`⚠️  ${controlBoxId}: Assembly not found in assemblies.json`);
        skippedCount++;
      }
    }
    
    // 5. Update metadata
    assembliesData.metadata.last_updated = new Date().toISOString();
    assembliesData.metadata.migration_notes = `Migrated ${migratedCount} control box component definitions from hardcoded logic`;
    
    // 6. Save updated assemblies.json
    await fs.writeFile(assembliesPath, JSON.stringify(assembliesData, null, 2));
    
    console.log('\n📊 MIGRATION SUMMARY:');
    console.log(`   ✅ Successfully migrated: ${migratedCount} control boxes`);
    console.log(`   ⚠️  Skipped (not found): ${skippedCount} control boxes`);
    console.log(`   💾 Updated: ${assembliesPath}`);
    console.log(`   🔒 Backup: ${backupPath}`);
    
    // 7. Validate migration
    console.log('\n🔍 VALIDATING MIGRATION:');
    console.log('───────────────────────────────────────────────────────────');
    
    const updatedAssemblies = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    let validationIssues = 0;
    
    for (const [controlBoxId, expectedComponents] of Object.entries(controlBoxComponents)) {
      const assembly = updatedAssemblies.assemblies[controlBoxId];
      if (assembly) {
        const actualComponents = assembly.components || [];
        
        if (actualComponents.length !== expectedComponents.length) {
          console.log(`❌ ${controlBoxId}: Component count mismatch (expected: ${expectedComponents.length}, actual: ${actualComponents.length})`);
          validationIssues++;
        } else {
          // Validate each component
          let componentMismatches = 0;
          for (let i = 0; i < expectedComponents.length; i++) {
            const expected = expectedComponents[i];
            const actual = actualComponents[i];
            
            if (expected.part_id !== actual.part_id || expected.quantity !== actual.quantity) {
              componentMismatches++;
            }
          }
          
          if (componentMismatches === 0) {
            console.log(`✅ ${controlBoxId}: Components match perfectly`);
          } else {
            console.log(`⚠️  ${controlBoxId}: ${componentMismatches} component mismatches`);
            validationIssues++;
          }
        }
      }
    }
    
    if (validationIssues === 0) {
      console.log('\n🎉 MIGRATION SUCCESSFUL: All components migrated correctly!');
    } else {
      console.log(`\n⚠️  MIGRATION ISSUES: ${validationIssues} validation issues found`);
    }
    
    // 8. Generate migration report
    const migrationReport = {
      timestamp: new Date().toISOString(),
      migratedControlBoxes: migratedCount,
      skippedControlBoxes: skippedCount,
      validationIssues: validationIssues,
      migratedAssemblies: Object.keys(controlBoxComponents),
      backupLocation: backupPath,
      sourceData: extractedPath
    };
    
    const reportPath = path.join(__dirname, '../migration-report-components.json');
    await fs.writeFile(reportPath, JSON.stringify(migrationReport, null, 2));
    
    console.log(`\n📄 Migration report saved: ${reportPath}`);
    
    return migrationReport;
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migrateComponentsToJSON()
    .then((report) => {
      console.log('\n✅ Component migration to JSON completed!');
      console.log(`📊 Migrated ${report.migratedControlBoxes} control box assemblies`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateComponentsToJSON };