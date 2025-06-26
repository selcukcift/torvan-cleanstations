const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function auditBOMDataIntegrity() {
  console.log('\n🔍 BOM DATA INTEGRITY AUDIT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const issues = {
    emptyComponentArrays: [],
    missingAssemblyReferences: [],
    missingPartReferences: [],
    missingDatabaseRelationships: [],
    hardcodedComponents: [],
    criticalAssembliesAffected: []
  };

  try {
    // 1. AUDIT ASSEMBLIES.JSON
    console.log('1️⃣ AUDITING ASSEMBLIES.JSON FILE');
    console.log('───────────────────────────────────────────────────────────');
    
    const assembliesPath = path.join(__dirname, '../resources/assemblies.json');
    const assembliesData = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    const assemblies = assembliesData.assemblies;
    
    console.log(`Total assemblies in JSON: ${Object.keys(assemblies).length}`);
    
    let emptyComponentCount = 0;
    let withComponentsCount = 0;
    
    for (const [assemblyId, assemblyData] of Object.entries(assemblies)) {
      if (!assemblyData.components || assemblyData.components.length === 0) {
        emptyComponentCount++;
        issues.emptyComponentArrays.push({
          assemblyId,
          name: assemblyData.name,
          type: assemblyData.type,
          category: assemblyData.category_code
        });
        
        // Flag critical assemblies
        if (assemblyId.includes('CTRL') || assemblyId.includes('T2-DL') || assemblyId.includes('T2-BSN')) {
          issues.criticalAssembliesAffected.push({
            assemblyId,
            name: assemblyData.name,
            reason: 'Critical assembly with empty components'
          });
        }
      } else {
        withComponentsCount++;
        
        // Check component references
        for (const component of assemblyData.components) {
          if (component.part_id && !component.assembly_id) {
            // TODO: Validate part exists in parts.json
          }
          if (component.assembly_id) {
            if (!assemblies[component.assembly_id]) {
              issues.missingAssemblyReferences.push({
                parentAssembly: assemblyId,
                missingReference: component.assembly_id
              });
            }
          }
        }
      }
    }
    
    console.log(`❌ Assemblies with empty components: ${emptyComponentCount}`);
    console.log(`✅ Assemblies with components: ${withComponentsCount}`);
    console.log(`📊 Empty component ratio: ${((emptyComponentCount / Object.keys(assemblies).length) * 100).toFixed(1)}%`);
    
    // 2. AUDIT PARTS.JSON REFERENCES
    console.log('\n2️⃣ AUDITING PARTS.JSON REFERENCES');
    console.log('───────────────────────────────────────────────────────────');
    
    const partsPath = path.join(__dirname, '../resources/parts.json');
    const partsData = JSON.parse(await fs.readFile(partsPath, 'utf-8'));
    const parts = partsData.parts;
    
    console.log(`Total parts in JSON: ${Object.keys(parts).length}`);
    
    // Check for part references in assemblies that don't exist
    for (const [assemblyId, assemblyData] of Object.entries(assemblies)) {
      if (assemblyData.components) {
        for (const component of assemblyData.components) {
          if (component.part_id && !parts[component.part_id]) {
            issues.missingPartReferences.push({
              parentAssembly: assemblyId,
              missingPart: component.part_id
            });
          }
        }
      }
    }
    
    console.log(`❌ Missing part references found: ${issues.missingPartReferences.length}`);
    
    // 3. AUDIT DATABASE RELATIONSHIPS
    console.log('\n3️⃣ AUDITING DATABASE ASSEMBLY COMPONENT RELATIONSHIPS');
    console.log('───────────────────────────────────────────────────────────');
    
    const dbAssemblies = await prisma.assembly.findMany({
      include: {
        components: {
          include: {
            childPart: true,
            childAssembly: true
          }
        }
      }
    });
    
    const assembliesWithComponents = dbAssemblies.filter(a => a.components.length > 0);
    const assembliesWithoutComponents = dbAssemblies.filter(a => a.components.length === 0);
    
    console.log(`Total assemblies in database: ${dbAssemblies.length}`);
    console.log(`❌ DB assemblies without components: ${assembliesWithoutComponents.length}`);
    console.log(`✅ DB assemblies with components: ${assembliesWithComponents.length}`);
    
    // Identify critical assemblies in DB with no components
    for (const assembly of assembliesWithoutComponents) {
      if (assembly.assemblyId.includes('CTRL') || assembly.assemblyId.includes('T2-DL') || 
          assembly.assemblyId.includes('T2-BSN') || assembly.assemblyId.includes('T2-BODY')) {
        issues.missingDatabaseRelationships.push({
          assemblyId: assembly.assemblyId,
          name: assembly.name,
          type: assembly.type,
          reason: 'Critical assembly has no component relationships in DB'
        });
      }
    }
    
    // 4. IDENTIFY HARDCODED COMPONENTS
    console.log('\n4️⃣ IDENTIFYING HARDCODED COMPONENTS IN BOM SERVICE');
    console.log('───────────────────────────────────────────────────────────');
    
    const bomServicePath = path.join(__dirname, '../lib/bomService.native.ts');
    const bomServiceContent = await fs.readFile(bomServicePath, 'utf-8');
    
    // Extract hardcoded control box components
    const controlBoxMatches = bomServiceContent.match(/case 'T2-CTRL-[^']+'/g);
    if (controlBoxMatches) {
      for (const match of controlBoxMatches) {
        const controlBoxId = match.replace("case '", '').replace("'", '');
        issues.hardcodedComponents.push({
          assemblyId: controlBoxId,
          location: 'bomService.native.ts',
          reason: 'Components hardcoded in switch statement'
        });
      }
    }
    
    console.log(`🔧 Hardcoded component definitions found: ${issues.hardcodedComponents.length}`);
    
    // 5. GENERATE SUMMARY REPORT
    console.log('\n5️⃣ COMPREHENSIVE ISSUES SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    
    console.log(`\n📊 ISSUE STATISTICS:`);
    console.log(`   Empty component arrays in JSON: ${issues.emptyComponentArrays.length}`);
    console.log(`   Missing assembly references: ${issues.missingAssemblyReferences.length}`);
    console.log(`   Missing part references: ${issues.missingPartReferences.length}`);
    console.log(`   Missing DB relationships: ${issues.missingDatabaseRelationships.length}`);
    console.log(`   Hardcoded components: ${issues.hardcodedComponents.length}`);
    console.log(`   Critical assemblies affected: ${issues.criticalAssembliesAffected.length}`);
    
    console.log(`\n🚨 CRITICAL ASSEMBLIES WITH ISSUES:`);
    const allCriticalIssues = [
      ...issues.criticalAssembliesAffected,
      ...issues.missingDatabaseRelationships,
      ...issues.hardcodedComponents
    ];
    
    const uniqueCritical = Array.from(new Map(
      allCriticalIssues.map(item => [item.assemblyId, item])
    ).values());
    
    uniqueCritical.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.assemblyId}: ${issue.reason}`);
    });
    
    console.log(`\n📋 RECOMMENDED ACTIONS:`);
    
    if (issues.emptyComponentArrays.length > 200) {
      console.log(`   🔧 PRIORITY 1: Populate ${issues.emptyComponentArrays.length} empty component arrays`);
    }
    
    if (issues.hardcodedComponents.length > 0) {
      console.log(`   🔧 PRIORITY 2: Migrate ${issues.hardcodedComponents.length} hardcoded component definitions to JSON`);
    }
    
    if (issues.missingDatabaseRelationships.length > 0) {
      console.log(`   🔧 PRIORITY 3: Re-seed database with complete component relationships`);
    }
    
    if (issues.missingPartReferences.length > 0) {
      console.log(`   🔧 PRIORITY 4: Fix ${issues.missingPartReferences.length} missing part references`);
    }
    
    console.log(`\n💾 Detailed audit results saved for further analysis.`);
    
    // Save detailed report
    const reportPath = path.join(__dirname, '../audit-results-bom-integrity.json');
    await fs.writeFile(reportPath, JSON.stringify(issues, null, 2));
    console.log(`📄 Full report: ${reportPath}`);
    
    return issues;
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the audit
if (require.main === module) {
  auditBOMDataIntegrity()
    .then((issues) => {
      console.log('\n✅ BOM data integrity audit completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

module.exports = { auditBOMDataIntegrity };