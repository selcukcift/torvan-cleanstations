const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAllConfigMappings() {
  console.log('\n🔍 COMPREHENSIVE CONFIGURATION MAPPING ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const mappingIssues = [];
  
  try {
    // 1. SINK MODELS
    console.log('1️⃣ SINK MODELS (Category: 721, Subcategory: 721.71-721.74)');
    console.log('───────────────────────────────────────────────────────────');
    const expectedSinkModels = [
      'T2-BODY-48-60-HA', 'T2-BODY-61-72-HA', 'T2-BODY-73-120-HA',
      'T2-BODY-48-60-FH', 'T2-BODY-61-72-FH', 'T2-BODY-73-120-FH',
      'T2-1B-INSTRO-HA', 'T2-1B-INSTRO-FH'
    ];
    
    const sinkModels = await prisma.assembly.findMany({
      where: {
        categoryCode: '721',
        subcategoryCode: { in: ['721.71', '721.72', '721.73', '721.74'] }
      },
      select: { assemblyId: true, name: true, categoryCode: true, subcategoryCode: true }
    });
    
    console.log(`Expected: ${expectedSinkModels.length} models`);
    console.log(`Found: ${sinkModels.length} models in correct categories`);
    
    // Check missing sink models
    for (const modelId of expectedSinkModels) {
      const exists = await prisma.assembly.findUnique({
        where: { assemblyId: modelId },
        select: { assemblyId: true, categoryCode: true, subcategoryCode: true }
      });
      
      if (!exists) {
        console.log(`❌ Missing: ${modelId}`);
        mappingIssues.push({ type: 'Sink Model', id: modelId, issue: 'Not found in database' });
      } else if (exists.categoryCode !== '721' || !['721.71', '721.72', '721.73', '721.74'].includes(exists.subcategoryCode)) {
        console.log(`⚠️  Wrong category: ${modelId} (${exists.categoryCode}/${exists.subcategoryCode})`);
        mappingIssues.push({ type: 'Sink Model', id: modelId, issue: `Wrong category: ${exists.categoryCode}/${exists.subcategoryCode}` });
      }
    }
    
    // 2. BASIN TYPES
    console.log('\n2️⃣ BASIN TYPES (Category: 722, Subcategory: 722.713)');
    console.log('───────────────────────────────────────────────────────────');
    const expectedBasinTypes = ['T2-BSN-EDR-KIT', 'T2-BSN-ESK-KIT', 'T2-BSN-ESK-DI-KIT'];
    
    const basinTypes = await prisma.assembly.findMany({
      where: {
        categoryCode: '722',
        subcategoryCode: '722.713',
        type: 'KIT'
      },
      select: { assemblyId: true, name: true }
    });
    
    console.log(`Expected: ${expectedBasinTypes.length} basin types`);
    console.log(`Found: ${basinTypes.length} basin types in correct category`);
    
    for (const basinId of expectedBasinTypes) {
      const exists = await prisma.assembly.findUnique({
        where: { assemblyId: basinId },
        select: { assemblyId: true, categoryCode: true, subcategoryCode: true }
      });
      
      if (!exists) {
        console.log(`❌ Missing: ${basinId}`);
        mappingIssues.push({ type: 'Basin Type', id: basinId, issue: 'Not found in database' });
      } else if (exists.categoryCode !== '722' || exists.subcategoryCode !== '722.713') {
        console.log(`⚠️  Wrong category: ${basinId} (${exists.categoryCode}/${exists.subcategoryCode})`);
        mappingIssues.push({ type: 'Basin Type', id: basinId, issue: `Wrong category: ${exists.categoryCode}/${exists.subcategoryCode}` });
      }
    }
    
    // 3. BASIN SIZES
    console.log('\n3️⃣ BASIN SIZES (Category: 722, Subcategory: 722.712)');
    console.log('───────────────────────────────────────────────────────────');
    const expectedBasinSizes = [
      'T2-ADW-BASIN20X20X8', 'T2-ADW-BASIN24X20X8', 'T2-ADW-BASIN24X20X10',
      'T2-ADW-BASIN30X20X8', 'T2-ADW-BASIN30X20X10'
    ];
    
    const basinSizes = await prisma.assembly.findMany({
      where: {
        categoryCode: '722',
        subcategoryCode: '722.712',
        type: 'SIMPLE'
      },
      select: { assemblyId: true, name: true }
    });
    
    console.log(`Expected: ${expectedBasinSizes.length} basin sizes`);
    console.log(`Found: ${basinSizes.length} basin sizes in correct category`);
    
    for (const sizeId of expectedBasinSizes) {
      const exists = await prisma.assembly.findUnique({
        where: { assemblyId: sizeId },
        select: { assemblyId: true, categoryCode: true, subcategoryCode: true }
      });
      
      if (!exists) {
        console.log(`❌ Missing: ${sizeId}`);
        mappingIssues.push({ type: 'Basin Size', id: sizeId, issue: 'Not found in database' });
      } else if (exists.categoryCode !== '722' || exists.subcategoryCode !== '722.712') {
        console.log(`⚠️  Wrong category: ${sizeId} (${exists.categoryCode}/${exists.subcategoryCode})`);
        mappingIssues.push({ type: 'Basin Size', id: sizeId, issue: `Wrong category: ${exists.categoryCode}/${exists.subcategoryCode}` });
      }
    }
    
    // 4. BASIN ADD-ONS
    console.log('\n4️⃣ BASIN ADD-ONS (Category: 706, Subcategories: 706.65, 706.67, 706.68)');
    console.log('───────────────────────────────────────────────────────────');
    
    const basinAddons = await prisma.assembly.findMany({
      where: {
        categoryCode: '706',
        subcategoryCode: { in: ['706.65', '706.67', '706.68'] }
      },
      select: { assemblyId: true, name: true, subcategoryCode: true }
    });
    
    console.log(`Found: ${basinAddons.length} basin add-ons in correct categories`);
    if (basinAddons.length === 0) {
      console.log(`❌ No basin add-ons found`);
      mappingIssues.push({ type: 'Basin Add-ons', id: 'All', issue: 'No add-ons found in category 706' });
    }
    
    // 5. CONTROL BOXES
    console.log('\n5️⃣ CONTROL BOXES (Category: 718, Subcategory: 718.72)');
    console.log('───────────────────────────────────────────────────────────');
    
    const controlBoxes = await prisma.assembly.findMany({
      where: {
        categoryCode: '718',
        subcategoryCode: '718.72'
      },
      select: { assemblyId: true, name: true }
    });
    
    console.log(`Found: ${controlBoxes.length} control boxes`);
    if (controlBoxes.length === 0) {
      console.log(`❌ No control boxes found`);
      mappingIssues.push({ type: 'Control Box', id: 'All', issue: 'No control boxes found in category 718.72' });
    }
    
    // 6. PEGBOARDS
    console.log('\n6️⃣ PEGBOARDS (Category: 723, Subcategory: 723.01)');
    console.log('───────────────────────────────────────────────────────────');
    const expectedPegboards = ['T2-PEG-EG2-BLACK', 'T2-PEG-EG2-YELLOW', 'T2-PEG-EG2-GREY'];
    
    const pegboards = await prisma.assembly.findMany({
      where: {
        categoryCode: '723',
        subcategoryCode: '723.01'
      },
      select: { assemblyId: true, name: true }
    });
    
    console.log(`Expected at least: ${expectedPegboards.length} pegboard types`);
    console.log(`Found: ${pegboards.length} pegboards in correct category`);
    
    for (const pegId of expectedPegboards) {
      const exists = await prisma.assembly.findUnique({
        where: { assemblyId: pegId },
        select: { assemblyId: true, categoryCode: true, subcategoryCode: true }
      });
      
      if (!exists) {
        console.log(`❌ Missing: ${pegId}`);
        mappingIssues.push({ type: 'Pegboard', id: pegId, issue: 'Not found in database' });
      } else if (exists.categoryCode !== '723' || exists.subcategoryCode !== '723.01') {
        console.log(`⚠️  Wrong category: ${pegId} (${exists.categoryCode}/${exists.subcategoryCode})`);
        mappingIssues.push({ type: 'Pegboard', id: pegId, issue: `Wrong category: ${exists.categoryCode}/${exists.subcategoryCode}` });
      }
    }
    
    // 7. FAUCETS
    console.log('\n7️⃣ FAUCETS (Category: 720, Subcategory: 720.702)');
    console.log('───────────────────────────────────────────────────────────');
    
    const faucets = await prisma.assembly.findMany({
      where: {
        categoryCode: '720',
        subcategoryCode: '720.702'
      },
      select: { assemblyId: true, name: true }
    });
    
    console.log(`Found: ${faucets.length} faucets`);
    if (faucets.length === 0) {
      console.log(`❌ No faucets found`);
      mappingIssues.push({ type: 'Faucet', id: 'All', issue: 'No faucets found in category 720.702' });
    }
    
    // 8. ACCESSORIES
    console.log('\n8️⃣ ACCESSORIES (Category: 720, Various subcategories)');
    console.log('───────────────────────────────────────────────────────────');
    
    const accessories = await prisma.assembly.findMany({
      where: {
        categoryCode: '720',
        isOrderable: true
      },
      select: { assemblyId: true, name: true, subcategoryCode: true }
    });
    
    console.log(`Found: ${accessories.length} orderable accessories`);
    
    // SUMMARY
    console.log('\n\n📊 SUMMARY OF ISSUES');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total issues found: ${mappingIssues.length}`);
    
    if (mappingIssues.length > 0) {
      console.log('\nIssues by type:');
      const issuesByType = {};
      mappingIssues.forEach(issue => {
        if (!issuesByType[issue.type]) issuesByType[issue.type] = 0;
        issuesByType[issue.type]++;
      });
      
      Object.entries(issuesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} issues`);
      });
      
      console.log('\nDetailed issues:');
      mappingIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type} - ${issue.id}: ${issue.issue}`);
      });
    } else {
      console.log('✅ All configuration mappings appear to be correct!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAllConfigMappings();