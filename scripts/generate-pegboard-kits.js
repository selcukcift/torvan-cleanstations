#!/usr/bin/env node

/**
 * Script to generate comprehensive pegboard kit combinations
 * Creates 128 kit part numbers: 8 sizes × 2 types × 8 colors
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SIZES = ['3436', '4836', '6036', '7236', '8436', '9636', '10836', '12036'];
const TYPES = ['PERF', 'SOLID'];
const COLORS = ['GREEN', 'BLACK', 'YELLOW', 'GREY', 'RED', 'BLUE', 'ORANGE', 'WHITE'];

// Size to coverage mapping
const SIZE_COVERAGE = {
  '3436': '34" - 47"',
  '4836': '48" - 59"', 
  '6036': '60" - 71"',
  '7236': '72" - 83"',
  '8436': '84" - 95"',
  '9636': '95" - 107"',
  '10836': '108" - 119"',
  '12036': '120" - 130"'
};

function generateKitDefinition(size, type, color) {
  const typeText = type === 'PERF' ? 'PERFORATED' : 'SOLID';
  const coverage = SIZE_COVERAGE[size];
  
  return {
    [`T2-ADW-PB-${size}-${color}-${type}-KIT`]: {
      "name": `${size.slice(0, 2)}X${size.slice(2)} ${color} ${typeText} PEGBOARD KIT (COVERS ${coverage})`,
      "type": "KIT",
      "category_code": "723",
      "subcategory_code": "723.716",
      "can_order": true,
      "is_kit": true,
      "status": "ACTIVE",
      "components": [
        {
          "part_id": `T2-ADW-PB-${size}`,
          "quantity": 1,
          "notes": null
        },
        {
          "part_id": "22MP20026",
          "quantity": 1,
          "notes": null
        },
        {
          "part_id": "708.77",
          "quantity": 1,
          "notes": color
        }
      ]
    }
  };
}

function generateAllKits() {
  const allKits = {};
  let count = 0;
  
  console.log('🔧 Generating pegboard kit combinations...');
  console.log(`📊 Total combinations: ${SIZES.length} × ${TYPES.length} × ${COLORS.length} = ${SIZES.length * TYPES.length * COLORS.length}`);
  
  for (const size of SIZES) {
    console.log(`\n📦 Processing size ${size}...`);
    
    for (const type of TYPES) {
      for (const color of COLORS) {
        const kit = generateKitDefinition(size, type, color);
        Object.assign(allKits, kit);
        count++;
        
        const kitId = Object.keys(kit)[0];
        console.log(`  ✅ ${kitId}`);
      }
    }
  }
  
  console.log(`\n🎉 Generated ${count} kit combinations successfully!`);
  return allKits;
}

function generateJSONSnippet() {
  const kits = generateAllKits();
  
  // Convert to JSON format suitable for insertion into assemblies.json
  let jsonOutput = '';
  
  for (const [kitId, kitDef] of Object.entries(kits)) {
    jsonOutput += `    "${kitId}": ${JSON.stringify(kitDef, null, 6).replace(/^/gm, '    ')},\n`;
  }
  
  // Remove the trailing comma and newline
  jsonOutput = jsonOutput.slice(0, -2) + '\n';
  
  return jsonOutput;
}

function generateMappingFunction() {
  const mappingFunction = `
// Generated pegboard kit mapping function
function getPegboardKitId(sinkLength, pegboardType, color) {
  // Standard pegboard sizes with coverage ranges  
  const pegboardSizes = [
    { size: '3436', covers: [34, 47] },
    { size: '4836', covers: [48, 59] },
    { size: '6036', covers: [60, 71] },
    { size: '7236', covers: [72, 83] },
    { size: '8436', covers: [84, 95] },
    { size: '9636', covers: [95, 107] },
    { size: '10836', covers: [108, 119] },
    { size: '12036', covers: [120, 130] }
  ];

  // Find appropriate size based on sink length
  const selectedSize = pegboardSizes.find(pb => 
    sinkLength >= pb.covers[0] && sinkLength <= pb.covers[1]
  ) || pegboardSizes[pegboardSizes.length - 1]; // Default to largest if over range

  // Map pegboard type to suffix
  const typeCode = pegboardType === 'PERFORATED' ? 'PERF' : 'SOLID';
  const colorCode = color.toUpperCase();
  
  return \`T2-ADW-PB-\${selectedSize.size}-\${colorCode}-\${typeCode}-KIT\`;
}

// Example usage:
// getPegboardKitId(60, 'PERFORATED', 'Blue') -> 'T2-ADW-PB-6036-BLUE-PERF-KIT'
// getPegboardKitId(48, 'SOLID', 'Green') -> 'T2-ADW-PB-4836-GREEN-SOLID-KIT'
`;
  
  return mappingFunction;
}

function main() {
  console.log('🚀 Starting Pegboard Kit Generator');
  console.log('=====================================\n');
  
  try {
    // Generate the JSON snippet
    const jsonSnippet = generateJSONSnippet();
    
    // Write to output file
    const outputFile = path.join(__dirname, '../temp/pegboard-kits-generated.json');
    const outputDir = path.dirname(outputFile);
    
    // Ensure temp directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, jsonSnippet);
    console.log(`\n📄 JSON snippet saved to: ${outputFile}`);
    
    // Generate mapping function
    const mappingFunction = generateMappingFunction();
    const mappingFile = path.join(__dirname, '../temp/pegboard-mapping-function.js');
    fs.writeFileSync(mappingFile, mappingFunction);
    console.log(`📄 Mapping function saved to: ${mappingFile}`);
    
    // Generate summary report
    const report = `
Pegboard Kit Generation Report
==============================

Total Kits Generated: ${SIZES.length * TYPES.length * COLORS.length}

Sizes: ${SIZES.join(', ')}
Types: ${TYPES.join(', ')}
Colors: ${COLORS.join(', ')}

Sample Kit IDs:
- T2-ADW-PB-3436-BLUE-PERF-KIT
- T2-ADW-PB-6036-GREEN-SOLID-KIT
- T2-ADW-PB-12036-RED-PERF-KIT

Next Steps:
1. Review the generated JSON snippet
2. Insert into resources/assemblies.json after existing pegboard kits
3. Update BOM Debug Helper to use the mapping function
4. Test the kit selection logic

Generated Files:
- ${outputFile}
- ${mappingFile}
`;
    
    const reportFile = path.join(__dirname, '../temp/pegboard-generation-report.txt');
    fs.writeFileSync(reportFile, report);
    console.log(`📄 Report saved to: ${reportFile}`);
    
    console.log('\n🎉 Generation complete!');
    console.log('\nNext steps:');
    console.log('1. Review the generated files in the temp/ directory');
    console.log('2. Copy the JSON snippet into resources/assemblies.json');
    console.log('3. Use the mapping function in BOM Debug Helper');
    
  } catch (error) {
    console.error('❌ Error generating pegboard kits:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateAllKits,
  generateJSONSnippet,
  generateMappingFunction,
  getPegboardKitId: eval(generateMappingFunction().match(/function getPegboardKitId[^}]+}/)[0])
};