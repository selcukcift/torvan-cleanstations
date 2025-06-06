const fs = require('fs');

// Read the CSV file
const csvContent = fs.readFileSync('/mnt/f/Clean-stations/resources/master_dot_notation.csv', 'utf8');
const lines = csvContent.split('\n');

// Read assemblies.json
const assembliesJson = JSON.parse(fs.readFileSync('/mnt/f/Clean-stations/resources/assemblies.json', 'utf8'));

// Parse CSV to find components based on dot notation
function findComponentsInCSV(assemblyCode) {
    const components = [];
    const pattern = new RegExp(`^${assemblyCode}\\.\\d+,`);
    
    lines.forEach(line => {
        if (pattern.test(line)) {
            const parts = line.split(',');
            if (parts.length >= 3) {
                components.push({
                    code: parts[0],
                    partId: parts[1],
                    name: parts[2]
                });
            }
        }
    });
    
    return components;
}

// Check specific assemblies
console.log('=== T2-DL27-KIT (711.97) ===');
console.log('Components in CSV:');
const csvComponents = findComponentsInCSV('711.97');
csvComponents.forEach(comp => {
    console.log(`  ${comp.code}: ${comp.partId} - ${comp.name}`);
});

console.log('\nComponents in assemblies.json:');
const jsonComponents = assembliesJson.assemblies['T2-DL27-KIT']?.components || [];
console.log(`  Found ${jsonComponents.length} components`);
jsonComponents.forEach(comp => {
    console.log(`  - ${comp.part_id} (qty: ${comp.quantity})`);
});

console.log('\n=== T2-DL27-FH-KIT (711.100) ===');
console.log('Components in CSV:');
const csvComponentsFH = findComponentsInCSV('711.100');
csvComponentsFH.forEach(comp => {
    console.log(`  ${comp.code}: ${comp.partId} - ${comp.name}`);
});

console.log('\nComponents in assemblies.json:');
const jsonComponentsFH = assembliesJson.assemblies['T2-DL27-FH-KIT']?.components || [];
console.log(`  Found ${jsonComponentsFH.length} components`);
jsonComponentsFH.forEach(comp => {
    console.log(`  - ${comp.part_id} (qty: ${comp.quantity})`);
});

// Check if all CSV components are in JSON
console.log('\n=== VERIFICATION ===');
console.log('T2-DL27-KIT - CSV components in JSON:');
const jsonPartIds = jsonComponents.map(c => c.part_id);
csvComponents.forEach(comp => {
    const found = jsonPartIds.includes(comp.partId);
    console.log(`  ${comp.partId}: ${found ? '✓' : '✗ MISSING'}`);
});