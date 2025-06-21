// Complete Single Source of Truth JSON Generator
// This script generates a comprehensive JSON for order cmc63cab70001j5vkq394jsp6

// Using built-in fetch (Node.js 18+)

// Order configuration extracted from database
const orderConfiguration = {
  customerInfo: {
    poNumber: "4587",
    customerName: "Acme",
    projectName: "VCx", 
    salesPerson: "Sal",
    wantDate: "2025-07-02T00:00:00.000Z",
    language: "FR",
    notes: "333"
  },
  
  sinkSelection: {
    sinkModelId: "T2-B2",
    quantity: 1,
    buildNumbers: ["2222"]
  },
  
  configurations: {
    "2222": {
      sinkModelId: "T2-B2",
      width: 48,
      length: 90,
      legsTypeId: "T2-DL14-KIT",
      feetTypeId: "T2-LEVELING-CASTOR-475",
      pegboard: true,
      pegboardTypeId: "SOLID",
      drawersAndCompartments: ["T2-OA-PO-SHLF-1212"],
      workflowDirection: "LEFT_TO_RIGHT",
      
      basins: [
        {
          basinTypeId: "E_DRAIN",
          basinType: "E_DRAIN",
          basinSizePartNumber: "T2-ADW-BASIN24X20X10",
          addonIds: ["T2-OA-BASIN-LIGHT-EDR-KIT"]
        },
        {
          basinTypeId: "E_SINK", 
          basinType: "E_SINK",
          basinSizePartNumber: "T2-ADW-BASIN24X20X10",
          addonIds: ["T2-OA-BASIN-LIGHT-ESK-KIT"]
        }
      ],
      
      faucets: [
        {
          faucetTypeId: "T2-OA-STD-FAUCET-WB-KIT",
          placement: "BASIN_1",
          quantity: 1
        }
      ],
      
      sprayers: [
        {
          sprayerTypeId: "T2-OA-WATERGUN-TURRET-KIT",
          location: "RIGHT_SIDE"
        }
      ]
    }
  },
  
  accessories: {
    "2222": [
      {
        assemblyId: "T-OA-BINRAIL-36-KIT",
        quantity: 5
      }
    ]
  }
};

async function generateCompleteBOM() {
  try {
    console.log('🔧 Calling BOM Preview API...');
    
    const response = await fetch('http://localhost:3005/api/orders/preview-bom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderConfiguration)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const bomData = await response.json();
    
    if (!bomData.success) {
      throw new Error(`BOM generation failed: ${bomData.message}`);
    }
    
    console.log('✅ BOM data received successfully');
    
    // Create comprehensive JSON structure
    const completeOrderJSON = {
      metadata: {
        orderId: "cmc63cab70001j5vkq394jsp6",
        orderNumber: "ORD-2025-4587",
        generatedAt: new Date().toISOString(),
        version: "1.0.0",
        sourceOfTruth: true,
        description: "Complete single source of truth for all downstream modules"
      },
      
      orderDetails: {
        id: "cmc63cab70001j5vkq394jsp6",
        status: "ORDER_CREATED",
        createdAt: "2025-06-21T14:23:27.000Z",
        customer: orderConfiguration.customerInfo,
        sinkSelection: orderConfiguration.sinkSelection
      },
      
      // Complete configuration details for reference
      configuration: {
        buildNumber: "2222",
        sinkModel: "T2-B2",
        dimensions: {
          width: 48,
          length: 90,
          unit: "inches"
        },
        
        structuralComponents: {
          legs: {
            typeId: "T2-DL14-KIT",
            name: "DL14 Height Adjustable Legs Kit",
            type: "HEIGHT_ADJUSTABLE"
          },
          feet: {
            typeId: "T2-LEVELING-CASTOR-475", 
            name: "Leveling Casters 475lbs",
            type: "LEVELING_CASTERS"
          }
        },
        
        pegboard: {
          enabled: true,
          type: "SOLID",
          sizeBasedOnLength: 90
        },
        
        storage: {
          drawersAndCompartments: ["T2-OA-PO-SHLF-1212"]
        },
        
        basins: orderConfiguration.configurations["2222"].basins.map((basin, index) => ({
          position: index + 1,
          type: basin.basinType,
          size: basin.basinSizePartNumber,
          addons: basin.addonIds
        })),
        
        faucets: orderConfiguration.configurations["2222"].faucets,
        sprayers: orderConfiguration.configurations["2222"].sprayers,
        workflowDirection: "LEFT_TO_RIGHT"
      },
      
      // Complete BOM from service (preserved exactly)
      billOfMaterials: {
        source: "BOM Service API",
        generatedAt: new Date().toISOString(),
        hierarchical: bomData.data.bom?.hierarchical || [],
        flattened: bomData.data.bom?.flattened || [],
        totalItems: bomData.data.bom?.totalItems || 0,
        
        // Enhanced structure for downstream modules
        byCategory: {},
        byAssembly: {},
        flattenedWithRelationships: []
      },
      
      // Module-specific data sections
      manufacturingData: {
        assemblies: [],
        workInstructions: [],
        estimatedLeadTime: "8-10 weeks",
        specialRequirements: [
          "Basin lighting installation",
          "Electronic control system setup", 
          "French language documentation"
        ]
      },
      
      qualityControlData: {
        inspectionPoints: [],
        testProcedures: [],
        complianceStandards: ["ISO 13485:2016", "NSF/ANSI 2"]
      },
      
      procurementData: {
        outsourcedParts: [],
        vendorRequirements: [],
        leadTimeAnalysis: {}
      },
      
      shippingData: {
        estimatedWeight: "450 lbs",
        dimensions: {
          length: 96,
          width: 54, 
          height: 42,
          unit: "inches"
        },
        specialHandling: ["Electronic components", "Fragile glass components"]
      }
    };
    
    // Process BOM data to enhance structure
    if (bomData.data.bom?.hierarchical) {
      const categorizedBOM = categorizeBOMItems(bomData.data.bom.hierarchical);
      const enhancedFlattened = addParentChildRelationships(bomData.data.bom.flattened);
      
      // Update BOM structure with enhanced data
      completeOrderJSON.billOfMaterials = {
        ...completeOrderJSON.billOfMaterials,
        ...categorizedBOM,
        flattenedWithRelationships: enhancedFlattened,
        
        // Manufacturing analysis
        manufacturingBreakdown: analyzeManufacturingRequirements(enhancedFlattened),
        procurementBreakdown: analyzeProcurementRequirements(enhancedFlattened),
        
        // Assembly tree for production planning
        assemblyTree: buildAssemblyTree(bomData.data.bom.hierarchical),
        
        // Critical path analysis
        criticalComponents: identifyCriticalComponents(enhancedFlattened)
      };
      
      // Enhanced module-specific data
      completeOrderJSON.manufacturingData = buildManufacturingData(enhancedFlattened, categorizedBOM);
      completeOrderJSON.qualityControlData = buildQCData(enhancedFlattened, categorizedBOM);
      completeOrderJSON.procurementData = buildProcurementData(enhancedFlattened, categorizedBOM);
      completeOrderJSON.shippingData = buildShippingData(enhancedFlattened, categorizedBOM, orderConfiguration);
    }
    
    // Write to file
    const fs = require('fs');
    fs.writeFileSync(
      '/media/selcuk/project files/Clean-stations/complete-order-source-of-truth.json',
      JSON.stringify(completeOrderJSON, null, 2)
    );
    
    console.log('✅ Complete JSON generated successfully!');
    console.log(`📊 Total BOM items: ${completeOrderJSON.billOfMaterials.totalItems}`);
    console.log('📁 File saved as: complete-order-source-of-truth.json');
    
  } catch (error) {
    console.error('❌ Error generating complete BOM:', error);
  }
}

function categorizeBOMItems(hierarchical) {
  const categories = {};
  const byType = {};
  const byAssembly = {};
  
  function processItem(item, parentPath = '', level = 0) {
    // Categorize by category
    const category = item.category || 'UNCATEGORIZED';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({
      ...item,
      parentPath,
      level,
      fullPath: parentPath ? `${parentPath} → ${item.name}` : item.name
    });
    
    // Categorize by type
    const type = item.type || 'UNKNOWN';
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(item);
    
    // Create assembly mapping
    if (item.type === 'KIT' || item.type === 'COMPLEX' || item.components?.length > 0) {
      byAssembly[item.id] = {
        ...item,
        parentPath,
        level,
        componentCount: item.components?.length || 0
      };
    }
    
    // Process children/components
    const children = item.children || item.components || [];
    children.forEach(child => {
      const childPath = parentPath ? `${parentPath} → ${item.name}` : item.name;
      processItem(child, childPath, level + 1);
    });
  }
  
  hierarchical.forEach(item => processItem(item));
  
  return {
    byCategory: categories,
    byType,
    byAssembly,
    summary: {
      totalCategories: Object.keys(categories).length,
      totalTypes: Object.keys(byType).length,
      totalAssemblies: Object.keys(byAssembly).length,
      categoryCounts: Object.fromEntries(
        Object.entries(categories).map(([cat, items]) => [cat, items.length])
      )
    }
  };
}

function addParentChildRelationships(flattened) {
  // Create a map of all items by ID for relationship tracking
  const itemMap = new Map();
  flattened.forEach(item => itemMap.set(item.id, item));
  
  return flattened.map((item, index) => {
    const componentCount = item.components?.length || 0;
    const hasChildren = componentCount > 0;
    
    // Determine parent-child relationships
    const relationships = {
      ...item,
      index: index + 1,
      parentPath: item.parentPath || 'Top Level',
      childCount: componentCount,
      isAssembly: hasChildren,
      isPart: !hasChildren,
      isTopLevel: !item.parentPath,
      depth: item.level || 0,
      
      // Manufacturing info
      manufacturingType: determineManufacturingType(item),
      procurementType: determineProcurementType(item),
      
      // Relationships
      children: item.components?.map(child => ({
        id: child.id,
        name: child.name,
        quantity: child.quantity,
        type: child.type,
        category: child.category
      })) || [],
      
      // Parent info
      parentInfo: item.parentPath ? {
        path: item.parentPath,
        level: item.level || 0
      } : null
    };
    
    return relationships;
  });
}

function determineManufacturingType(item) {
  if (item.type === 'KIT') return 'ASSEMBLY_KIT';
  if (item.type === 'COMPLEX') return 'COMPLEX_ASSEMBLY';
  if (item.type === 'SIMPLE') return 'SIMPLE_ASSEMBLY';
  if (item.category === 'PART') return 'MANUFACTURED_PART';
  if (item.type === 'SERVICE_PART') return 'PURCHASED_PART';
  return 'COMPONENT';
}

function determineProcurementType(item) {
  if (item.type === 'SERVICE_PART') return 'EXTERNAL_PURCHASE';
  if (item.category === 'PART' && item.id.includes('T2-')) return 'INTERNAL_MANUFACTURE';
  if (item.category === 'PART') return 'EXTERNAL_PURCHASE';
  return 'ASSEMBLY';
}

// Analysis functions for enhanced BOM processing
function analyzeManufacturingRequirements(flattened) {
  const breakdown = {
    totalParts: 0,
    assemblies: 0,
    purchasedParts: 0,
    manufacturedParts: 0,
    complexAssemblies: 0,
    simpleAssemblies: 0,
    kits: 0
  };
  
  flattened.forEach(item => {
    breakdown.totalParts++;
    
    switch(item.manufacturingType) {
      case 'ASSEMBLY_KIT': breakdown.kits++; break;
      case 'COMPLEX_ASSEMBLY': breakdown.complexAssemblies++; break;
      case 'SIMPLE_ASSEMBLY': breakdown.simpleAssemblies++; break;
      case 'MANUFACTURED_PART': breakdown.manufacturedParts++; break;
      case 'PURCHASED_PART': breakdown.purchasedParts++; break;
    }
    
    if (item.isAssembly) breakdown.assemblies++;
  });
  
  return breakdown;
}

function analyzeProcurementRequirements(flattened) {
  const breakdown = {
    internalManufacture: [],
    externalPurchase: [],
    assemblies: [],
    totalItems: flattened.length
  };
  
  flattened.forEach(item => {
    const procItem = {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      type: item.type,
      category: item.category,
      priority: item.type === 'SERVICE_PART' ? 'HIGH' : 'NORMAL'
    };
    
    switch(item.procurementType) {
      case 'INTERNAL_MANUFACTURE':
        breakdown.internalManufacture.push(procItem);
        break;
      case 'EXTERNAL_PURCHASE':
        breakdown.externalPurchase.push(procItem);
        break;
      case 'ASSEMBLY':
        breakdown.assemblies.push(procItem);
        break;
    }
  });
  
  return breakdown;
}

function buildAssemblyTree(hierarchical) {
  return hierarchical.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    category: item.category,
    quantity: item.quantity,
    hasChildren: (item.components?.length || 0) > 0,
    childCount: item.components?.length || 0,
    children: item.components?.map(child => ({
      id: child.id,
      name: child.name,
      type: child.type,
      quantity: child.quantity,
      hasChildren: (child.components?.length || 0) > 0
    })) || []
  }));
}

function identifyCriticalComponents(flattened) {
  const critical = [];
  
  flattened.forEach(item => {
    let criticalReasons = [];
    
    // Electronic components
    if (item.name.toLowerCase().includes('electronic') || 
        item.name.toLowerCase().includes('control') ||
        item.id.includes('CTRL')) {
      criticalReasons.push('Electronic component');
    }
    
    // Basin components (core functionality)
    if (item.category === 'BASIN_TYPE_KIT' || 
        item.name.toLowerCase().includes('basin')) {
      criticalReasons.push('Core sink functionality');
    }
    
    // Frame components (structural)
    if (item.name.toLowerCase().includes('frame') ||
        item.category === 'SINK_BODY') {
      criticalReasons.push('Structural component');
    }
    
    // Service parts (external dependencies)
    if (item.type === 'SERVICE_PART') {
      criticalReasons.push('External dependency');
    }
    
    if (criticalReasons.length > 0) {
      critical.push({
        ...item,
        criticalReasons,
        priority: criticalReasons.includes('Electronic component') ? 'CRITICAL' : 'HIGH'
      });
    }
  });
  
  return critical.sort((a, b) => {
    const priorities = { 'CRITICAL': 3, 'HIGH': 2, 'NORMAL': 1 };
    return priorities[b.priority] - priorities[a.priority];
  });
}

function buildManufacturingData(flattened, categorized) {
  const manufacturingSteps = [];
  const workInstructions = [];
  
  // Determine assembly sequence based on hierarchy
  const assemblyOrder = [
    'SYSTEM', // Manuals first
    'SINK_BODY', // Main structure
    'SUB_ASSEMBLY', // Sub-assemblies
    'PEGBOARD_LEGACY_SIZE', // Pegboard
    'DRAWER_COMPARTMENT', // Storage
    'BASIN_TYPE_KIT', // Basins
    'CONTROL_BOX', // Electronics
    'FAUCET_KIT', // Faucets
    'SPRAYER_KIT' // Final accessories
  ];
  
  assemblyOrder.forEach((category, index) => {
    if (categorized.byCategory[category]) {
      manufacturingSteps.push({
        step: index + 1,
        category,
        description: getCategoryDescription(category),
        components: categorized.byCategory[category].length,
        estimatedTime: estimateAssemblyTime(category),
        requiredSkills: getRequiredSkills(category),
        workstation: getWorkstation(category)
      });
    }
  });
  
  return {
    assemblySequence: manufacturingSteps,
    workInstructions: generateWorkInstructions(categorized),
    estimatedLeadTime: "8-10 weeks",
    specialRequirements: [
      "Basin lighting installation",
      "Electronic control system setup", 
      "French language documentation",
      "Height adjustable leg calibration"
    ],
    qualityCheckpoints: [
      "Frame alignment verification",
      "Basin installation check",
      "Electronic system test",
      "Final inspection"
    ]
  };
}

function buildQCData(flattened, categorized) {
  return {
    inspectionPoints: [
      {
        stage: "Frame Assembly",
        checkpoints: ["Weld quality", "Dimensional accuracy", "Surface finish"],
        category: "SINK_BODY"
      },
      {
        stage: "Basin Installation", 
        checkpoints: ["Alignment", "Seal integrity", "Drainage test"],
        category: "BASIN_TYPE_KIT"
      },
      {
        stage: "Electronic Systems",
        checkpoints: ["Wiring continuity", "Control box function", "Safety tests"],
        category: "CONTROL_BOX"
      },
      {
        stage: "Final Assembly",
        checkpoints: ["Overall function", "Documentation", "Packaging"],
        category: "SYSTEM"
      }
    ],
    testProcedures: [
      "Water pressure test",
      "Electronic system validation", 
      "Height adjustment verification",
      "French documentation review"
    ],
    complianceStandards: ["ISO 13485:2016", "NSF/ANSI 2"],
    criticalToQuality: identifyCriticalComponents(flattened).slice(0, 10)
  };
}

function buildProcurementData(flattened, categorized) {
  const procurement = analyzeProcurementRequirements(flattened);
  
  return {
    ...procurement,
    leadTimeAnalysis: {
      internalParts: "2-3 weeks",
      purchasedParts: "4-6 weeks", 
      electronicComponents: "6-8 weeks",
      customFabrication: "3-4 weeks"
    },
    vendorCategories: {
      electronics: "Specialized medical device suppliers",
      hardware: "Standard industrial suppliers",
      fabrication: "Internal manufacturing capability"
    },
    criticalPath: [
      "Electronic control systems",
      "Basin fabrication",
      "Frame welding and finishing"
    ]
  };
}

function buildShippingData(flattened, categorized, orderConfig) {
  const dimensions = orderConfig.configurations["2222"];
  
  return {
    estimatedWeight: "450 lbs",
    dimensions: {
      length: (dimensions.length || 90) + 6, // Add packaging
      width: (dimensions.width || 48) + 6,
      height: 42,
      unit: "inches"
    },
    specialHandling: [
      "Electronic components",
      "Fragile glass components",
      "Heavy lifting required"
    ],
    packagingRequirements: [
      "Anti-static protection for electronics",
      "Cushioning for basins",
      "Moisture protection",
      "French documentation included"
    ],
    shippingClass: "Class 200 - Heavy machinery",
    estimatedShippingCost: "$800-1200 depending on destination"
  };
}

// Helper functions
function getCategoryDescription(category) {
  const descriptions = {
    'SYSTEM': 'Documentation and manuals',
    'SINK_BODY': 'Main structural assembly',
    'SUB_ASSEMBLY': 'Component sub-assemblies',
    'PEGBOARD_LEGACY_SIZE': 'Pegboard installation',
    'DRAWER_COMPARTMENT': 'Storage components',
    'BASIN_TYPE_KIT': 'Basin and lighting installation',
    'CONTROL_BOX': 'Electronic control systems',
    'FAUCET_KIT': 'Faucet installation',
    'SPRAYER_KIT': 'Sprayer system installation'
  };
  return descriptions[category] || 'General assembly';
}

function estimateAssemblyTime(category) {
  const times = {
    'SYSTEM': '30 min',
    'SINK_BODY': '6-8 hours',
    'SUB_ASSEMBLY': '2-3 hours',
    'PEGBOARD_LEGACY_SIZE': '1 hour',
    'DRAWER_COMPARTMENT': '1 hour',
    'BASIN_TYPE_KIT': '3-4 hours',
    'CONTROL_BOX': '4-5 hours',
    'FAUCET_KIT': '2 hours',
    'SPRAYER_KIT': '1-2 hours'
  };
  return times[category] || '1-2 hours';
}

function getRequiredSkills(category) {
  const skills = {
    'SYSTEM': ['Documentation review'],
    'SINK_BODY': ['Welding', 'Heavy assembly'],
    'SUB_ASSEMBLY': ['Mechanical assembly'],
    'PEGBOARD_LEGACY_SIZE': ['Mounting', 'Drilling'],
    'DRAWER_COMPARTMENT': ['Cabinet installation'],
    'BASIN_TYPE_KIT': ['Plumbing', 'Electrical'],
    'CONTROL_BOX': ['Electronics', 'Programming'],
    'FAUCET_KIT': ['Plumbing'],
    'SPRAYER_KIT': ['Plumbing', 'System integration']
  };
  return skills[category] || ['General assembly'];
}

function getWorkstation(category) {
  const stations = {
    'SYSTEM': 'Documentation prep',
    'SINK_BODY': 'Heavy assembly station',
    'SUB_ASSEMBLY': 'Sub-assembly bench',
    'PEGBOARD_LEGACY_SIZE': 'Installation bench',
    'DRAWER_COMPARTMENT': 'Cabinet assembly',
    'BASIN_TYPE_KIT': 'Plumbing/electrical station',
    'CONTROL_BOX': 'Electronics bench',
    'FAUCET_KIT': 'Plumbing station',
    'SPRAYER_KIT': 'Final assembly'
  };
  return stations[category] || 'General assembly';
}

function generateWorkInstructions(categorized) {
  return [
    {
      step: 1,
      title: "Frame Assembly",
      category: "SINK_BODY",
      duration: "6-8 hours",
      tools: ["Welding equipment", "Measuring tools", "Lifting equipment"],
      safety: ["Safety glasses", "Welding protection", "Steel-toed boots"]
    },
    {
      step: 2, 
      title: "Basin Installation",
      category: "BASIN_TYPE_KIT",
      duration: "3-4 hours",
      tools: ["Plumbing tools", "Electrical tools", "Sealants"],
      safety: ["Eye protection", "Electrical safety"]
    },
    {
      step: 3,
      title: "Control System Setup",
      category: "CONTROL_BOX", 
      duration: "4-5 hours",
      tools: ["Electronic testing equipment", "Programming tools"],
      safety: ["ESD protection", "Electrical safety"]
    }
  ];
}

// Run the generator
generateCompleteBOM();