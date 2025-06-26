const fs = require('fs').promises;
const path = require('path');

async function extractHardcodedComponents() {
  console.log('\n🔧 EXTRACTING HARDCODED COMPONENT DEFINITIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Read the BOM service file
    const bomServicePath = path.join(__dirname, '../lib/bomService.native.ts');
    const bomServiceContent = await fs.readFile(bomServicePath, 'utf-8');
    
    // Extract hardcoded control box component definitions
    const hardcodedComponents = {};
    
    console.log('📋 EXTRACTED HARDCODED CONTROL BOX COMPONENTS:');
    console.log('───────────────────────────────────────────────────────────');
    
    // Define the control box component mappings found in the code
    const controlBoxComponents = {
      'T2-CTRL-EDR1': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 5 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-EDRAIN-BOARD-R3', quantity: 2 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 5 },
        { part_id: 'M8-DUST-CAP-M', quantity: 2 },
        { part_id: 'T-ESOM-F4-01', quantity: 2 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-ESK1': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 5 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-ESINK-BOARD-R3', quantity: 1 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 5 },
        { part_id: 'M8-DUST-CAP-M', quantity: 1 },
        { part_id: 'T-ESOM-F4-01', quantity: 1 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-EDR1-ESK1': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 6 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-EDRAIN-BOARD-R3', quantity: 2 },
        { part_id: 'T2-ESINK-BOARD-R3', quantity: 1 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 6 },
        { part_id: 'M8-DUST-CAP-M', quantity: 3 },
        { part_id: 'T-ESOM-F4-01', quantity: 3 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-EDR2': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 8 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-EDRAIN-BOARD-R3', quantity: 4 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 8 },
        { part_id: 'M8-DUST-CAP-M', quantity: 4 },
        { part_id: 'T-ESOM-F4-01', quantity: 4 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-ESK2': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 8 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-ESINK-BOARD-R3', quantity: 2 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 8 },
        { part_id: 'M8-DUST-CAP-M', quantity: 2 },
        { part_id: 'T-ESOM-F4-01', quantity: 2 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-EDR3': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 11 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-EDRAIN-BOARD-R3', quantity: 6 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 11 },
        { part_id: 'M8-DUST-CAP-M', quantity: 6 },
        { part_id: 'T-ESOM-F4-01', quantity: 6 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-ESK3': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 11 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-ESINK-BOARD-R3', quantity: 3 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 11 },
        { part_id: 'M8-DUST-CAP-M', quantity: 3 },
        { part_id: 'T-ESOM-F4-01', quantity: 3 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-EDR1-ESK2': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 9 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-EDRAIN-BOARD-R3', quantity: 2 },
        { part_id: 'T2-ESINK-BOARD-R3', quantity: 2 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 9 },
        { part_id: 'M8-DUST-CAP-M', quantity: 4 },
        { part_id: 'T-ESOM-F4-01', quantity: 4 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ],
      
      'T2-CTRL-EDR2-ESK1': [
        { part_id: 'Q13404-02', quantity: 1 },
        { part_id: 'PW-105R3-06', quantity: 1 },
        { part_id: '4995', quantity: 1 },
        { part_id: 'T2-M8-3P-MP-STR-0.61M', quantity: 9 },
        { part_id: 'HDR-150-24', quantity: 1 },
        { part_id: 'T2-EDRAIN-BOARD-R3', quantity: 4 },
        { part_id: 'T2-ESINK-BOARD-R3', quantity: 1 },
        { part_id: 'T2-CTRL-BOX-BRKT', quantity: 1 },
        { part_id: '1201578', quantity: 4 },
        { part_id: 'E7512-L-BLUE', quantity: 9 },
        { part_id: 'M8-DUST-CAP-M', quantity: 5 },
        { part_id: 'T-ESOM-F4-01', quantity: 5 },
        { part_id: 'T2-BSN-OHL-BTN', quantity: 1 }
      ]
    };
    
    // Display extracted components
    for (const [controlBoxId, components] of Object.entries(controlBoxComponents)) {
      console.log(`\n🔧 ${controlBoxId}:`);
      console.log(`   Components: ${components.length}`);
      
      let totalParts = 0;
      components.forEach(comp => {
        totalParts += comp.quantity;
        console.log(`      ${comp.quantity}x ${comp.part_id}`);
      });
      console.log(`   Total parts: ${totalParts}`);
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Control boxes with hardcoded components: ${Object.keys(controlBoxComponents).length}`);
    
    // Calculate component complexity
    let totalUniqueComponents = new Set();
    let totalComponentInstances = 0;
    
    for (const components of Object.values(controlBoxComponents)) {
      components.forEach(comp => {
        totalUniqueComponents.add(comp.part_id);
        totalComponentInstances += comp.quantity;
      });
    }
    
    console.log(`   Unique component types used: ${totalUniqueComponents.size}`);
    console.log(`   Total component instances: ${totalComponentInstances}`);
    
    console.log('\n🔍 COMPONENT ANALYSIS:');
    const componentFrequency = {};
    for (const components of Object.values(controlBoxComponents)) {
      components.forEach(comp => {
        if (!componentFrequency[comp.part_id]) {
          componentFrequency[comp.part_id] = { count: 0, totalQty: 0 };
        }
        componentFrequency[comp.part_id].count++;
        componentFrequency[comp.part_id].totalQty += comp.quantity;
      });
    }
    
    // Sort by frequency
    const sortedComponents = Object.entries(componentFrequency)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10);
    
    console.log('\n   Most frequently used components:');
    sortedComponents.forEach(([partId, stats], index) => {
      console.log(`   ${index + 1}. ${partId}: Used in ${stats.count} control boxes (${stats.totalQty} total qty)`);
    });
    
    // Save extracted data for migration
    const extractedData = {
      extractedAt: new Date().toISOString(),
      source: 'lib/bomService.native.ts',
      controlBoxComponents,
      statistics: {
        totalControlBoxes: Object.keys(controlBoxComponents).length,
        uniqueComponentTypes: totalUniqueComponents.size,
        totalComponentInstances: totalComponentInstances
      }
    };
    
    const outputPath = path.join(__dirname, '../extracted-hardcoded-components.json');
    await fs.writeFile(outputPath, JSON.stringify(extractedData, null, 2));
    
    console.log(`\n💾 Extracted data saved to: ${outputPath}`);
    console.log('📋 Ready for migration to assemblies.json');
    
    return extractedData;
    
  } catch (error) {
    console.error('❌ Error extracting hardcoded components:', error.message);
    throw error;
  }
}

// Run the extraction
if (require.main === module) {
  extractHardcodedComponents()
    .then(() => {
      console.log('\n✅ Hardcoded component extraction completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { extractHardcodedComponents };