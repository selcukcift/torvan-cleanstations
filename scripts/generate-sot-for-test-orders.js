const fs = require('fs');
const path = require('path');

// Generate a mock single source of truth for the test orders
function generateMockSingleSourceOfTruth(orderId, basinCount, pegboard, feetType) {
  const now = new Date().toISOString();
  
  const basins = [];
  for (let i = 0; i < basinCount; i++) {
    basins.push({
      position: i + 1,
      type: 'T2-BASIN-STANDARD',
      size: 'T2-BASIN-18X24',
      addons: ['DRAIN_BUTTON', 'BASIN_LIGHT']
    });
  }

  return {
    metadata: {
      orderId: orderId,
      orderNumber: `ORD-2025-TEST-${orderId.slice(-6)}`,
      generatedAt: now,
      version: "1.0.0",
      sourceOfTruth: true,
      description: "Mock single source of truth for testing",
      lastUpdated: now,
      status: 'READY_FOR_PRE_QC'
    },
    
    orderDetails: {
      id: orderId,
      status: 'READY_FOR_PRE_QC'
    },
    
    configuration: {
      buildNumber: basinCount === 2 ? 'B001' : 'B002',
      sinkModel: 'T2-SINK-STANDARD',
      dimensions: {
        width: basinCount === 2 ? 48 : 72,
        length: basinCount === 2 ? 90 : 120,
        unit: "inches"
      },
      structuralComponents: {
        legs: {
          typeId: 'T2-DL14-KIT',
          name: 'DL14 Height Adjustable Legs Kit',
          type: "HEIGHT_ADJUSTABLE"
        },
        feet: {
          typeId: feetType,
          name: feetType === 'T2-LEVELING-CASTOR-475' ? 'Leveling Casters 475lbs' : 'Fixed Feet',
          type: feetType === 'T2-LEVELING-CASTOR-475' ? "LEVELING_CASTERS" : "LEVELING_FEET"
        }
      },
      pegboard: pegboard,
      pegboardType: pegboard ? 'T2-PEGBOARD-48' : null,
      storage: {
        drawersAndCompartments: []
      },
      basins: basins,
      faucets: [],
      sprayers: [],
      workflowDirection: 'LEFT_TO_RIGHT'
    }
  };
}

async function generateTestOrdersSOT() {
  console.log('📋 Generating single source of truth for test orders...');
  
  const ordersDir = path.join(process.cwd(), 'orders', 'single-source-of-truth');
  
  // Ensure directory exists
  if (!fs.existsSync(ordersDir)) {
    console.log(`📁 Creating directory: ${ordersDir}`);
    fs.mkdirSync(ordersDir, { recursive: true });
  }
  
  // Test order 1: 2 basins, pegboard, castors
  const testOrder1 = 'cmc88vam80001j5vyccyuqstz';
  const sot1 = generateMockSingleSourceOfTruth(testOrder1, 2, true, 'T2-LEVELING-CASTOR-475');
  const filePath1 = path.join(ordersDir, `order-${testOrder1}-source-of-truth.json`);
  fs.writeFileSync(filePath1, JSON.stringify(sot1, null, 2));
  console.log(`✅ Created SOT for 2-basin order: ${filePath1}`);
  
  // Test order 2: 3 basins, no pegboard, feet
  const testOrder2 = 'cmc88vbwb0006j5vywm10nopd';
  const sot2 = generateMockSingleSourceOfTruth(testOrder2, 3, false, 'T2-FIXED-FEET');
  const filePath2 = path.join(ordersDir, `order-${testOrder2}-source-of-truth.json`);
  fs.writeFileSync(filePath2, JSON.stringify(sot2, null, 2));
  console.log(`✅ Created SOT for 3-basin order: ${filePath2}`);
  
  console.log('\n🎯 Now you can test the dynamic Pre-QC checklist:');
  console.log('1. Navigate to the QC dashboard');
  console.log('2. Click on either test order to start Pre-QC');
  console.log('3. Observe the dynamic checklist behavior');
}

generateTestOrdersSOT();