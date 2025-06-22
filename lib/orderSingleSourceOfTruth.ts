import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface OrderConfiguration {
  customerInfo: {
    poNumber: string
    customerName: string
    projectName?: string
    salesPerson: string
    wantDate: string
    language: string
    notes?: string
  }
  sinkSelection: {
    sinkModelId: string
    quantity: number
    buildNumbers: string[]
  }
  configurations: Record<string, any>
  accessories: Record<string, any[]>
}

interface BOMData {
  hierarchical: any[]
  flattened: any[]
  totalItems: number
}

/**
 * Generate complete single source of truth JSON for an order
 * This contains all configuration details, complete BOM hierarchy, and module-specific data
 */
export async function generateOrderSingleSourceOfTruth(orderId: string): Promise<string> {
  try {
    console.log(`🏗️ Generating single source of truth JSON for order: ${orderId}`)
    
    // 1. Fetch complete order data from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        basinConfigurations: true,
        sinkConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
        createdBy: true
      }
    })

    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    // 2. Build order configuration for BOM API
    const orderConfiguration = buildOrderConfiguration(order)
    
    // 3. Generate BOM using the existing BOM service
    const bomData = await generateBOMData(orderConfiguration)
    
    // 4. Create comprehensive JSON structure
    const singleSourceOfTruth = await buildCompleteSingleSourceOfTruth(
      order, 
      orderConfiguration, 
      bomData
    )
    
    // 5. Save to file system (for reference and backup)
    const filePath = await saveOrderJSON(orderId, singleSourceOfTruth)
    
    // Comprehensive success verification logging
    console.log('\n' + '='.repeat(80))
    console.log('🎉 SINGLE SOURCE OF TRUTH GENERATION SUCCESSFUL')
    console.log('='.repeat(80))
    console.log(`📋 Order ID: ${orderId}`)
    console.log(`📁 File Path: ${filePath}`)
    console.log(`📊 Total BOM Items: ${bomData.totalItems}`)
    console.log(`🏗️ Top Level Items: ${bomData.topLevelItems || bomData.hierarchical.length}`)
    console.log(`📐 Configuration Build Numbers: ${Object.keys(orderConfiguration.configurations).join(', ')}`)
    console.log(`🔧 Manufacturing Steps: ${singleSourceOfTruth.manufacturingData?.assemblySequence?.length || 0}`)
    console.log(`🔍 QC Inspection Points: ${singleSourceOfTruth.qualityControlData?.inspectionPoints?.length || 0}`)
    console.log(`📦 Critical Components: ${singleSourceOfTruth.billOfMaterials?.criticalComponents?.length || 0}`)
    console.log(`⏰ Generated At: ${singleSourceOfTruth.metadata.generatedAt}`)
    console.log(`📏 File Size: ${Math.round(JSON.stringify(singleSourceOfTruth).length / 1024)} KB`)
    console.log('='.repeat(80))
    console.log('✅ JSON structure contains:')
    console.log('   ✅ Complete order metadata and configuration')
    console.log('   ✅ Full BOM hierarchy with parent-child relationships')
    console.log('   ✅ Manufacturing workflow data')
    console.log('   ✅ Quality control framework')
    console.log('   ✅ Procurement analysis')
    console.log('   ✅ Shipping information')
    console.log('   ✅ Workflow state tracking')
    console.log('='.repeat(80))
    console.log('🚀 Ready for downstream module consumption!')
    console.log('='.repeat(80) + '\n')
    
    return filePath
    
  } catch (error) {
    console.error(`❌ Error generating single source of truth for order ${orderId}:`, error)
    throw error
  }
}

/**
 * Build order configuration object from database order
 */
function buildOrderConfiguration(order: any): OrderConfiguration {
  const configurations: Record<string, any> = {}
  const accessories: Record<string, any[]> = {}
  
  // Group configurations by build number
  const buildNumbers = order.buildNumbers || []
  
  buildNumbers.forEach((buildNumber: string) => {
    // Find sink configuration for this build number
    const sinkConfig = order.sinkConfigurations?.find((sc: any) => 
      sc.buildNumber === buildNumber
    )
    
    if (sinkConfig) {
      configurations[buildNumber] = {
        sinkModelId: sinkConfig.sinkModelId,
        width: sinkConfig.width,
        length: sinkConfig.length || sinkConfig.sinkLength,
        legsTypeId: sinkConfig.legsTypeId || sinkConfig.legTypeId,
        feetTypeId: sinkConfig.feetTypeId,
        pegboard: sinkConfig.pegboard,
        pegboardTypeId: sinkConfig.pegboardTypeId || sinkConfig.pegboardType,
        drawersAndCompartments: sinkConfig.drawersAndCompartments || [],
        workflowDirection: sinkConfig.workflowDirection || 'LEFT_TO_RIGHT',
        
        // Basin configurations
        basins: order.basinConfigurations
          ?.filter((bc: any) => bc.buildNumber === buildNumber)
          ?.map((bc: any) => ({
            basinTypeId: bc.basinTypeId,
            basinType: bc.basinTypeId,
            basinSizePartNumber: bc.basinSizePartNumber,
            addonIds: bc.addonIds || []
          })) || [],
        
        // Faucet configurations
        faucets: order.faucetConfigurations
          ?.filter((fc: any) => fc.buildNumber === buildNumber)
          ?.map((fc: any) => ({
            faucetTypeId: fc.faucetTypeId,
            placement: fc.placement,
            quantity: fc.quantity || 1
          })) || [],
        
        // Sprayer configurations
        sprayers: order.sprayerConfigurations
          ?.filter((sc: any) => sc.buildNumber === buildNumber)
          ?.map((sc: any) => ({
            sprayerTypeId: sc.sprayerTypeId,
            location: sc.location
          })) || []
      }
    }
    
    // Accessories for this build number
    accessories[buildNumber] = order.selectedAccessories
      ?.filter((ac: any) => ac.buildNumber === buildNumber)
      ?.map((ac: any) => ({
        assemblyId: ac.assemblyId,
        quantity: ac.quantity
      })) || []
  })

  return {
    customerInfo: {
      poNumber: order.poNumber,
      customerName: order.customerName,
      projectName: order.projectName,
      salesPerson: order.salesPerson,
      wantDate: order.wantDate?.toISOString(),
      language: order.language,
      notes: order.notes
    },
    sinkSelection: {
      sinkModelId: order.sinkConfigurations?.[0]?.sinkModelId || '',
      quantity: buildNumbers.length,
      buildNumbers
    },
    configurations,
    accessories
  }
}

/**
 * Generate BOM data using the existing BOM service API
 */
async function generateBOMData(orderConfiguration: OrderConfiguration): Promise<BOMData> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3005'
    const response = await fetch(`${baseUrl}/api/orders/preview-bom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderConfiguration)
    })
    
    if (!response.ok) {
      throw new Error(`BOM API error: ${response.status} ${response.statusText}`)
    }
    
    const bomResponse = await response.json()
    
    if (!bomResponse.success) {
      throw new Error(`BOM generation failed: ${bomResponse.message}`)
    }
    
    return bomResponse.data.bom
    
  } catch (error) {
    console.error('❌ BOM generation failed:', error)
    throw error
  }
}

/**
 * Build complete single source of truth structure
 */
async function buildCompleteSingleSourceOfTruth(
  order: any, 
  orderConfiguration: OrderConfiguration, 
  bomData: BOMData
) {
  const now = new Date().toISOString()
  
  // Process BOM data for enhanced analysis
  const categorizedBOM = categorizeBOMItems(bomData.hierarchical)
  const enhancedFlattened = addParentChildRelationships(bomData.flattened)
  
  return {
    metadata: {
      orderId: order.id,
      orderNumber: `ORD-${new Date().getFullYear()}-${order.poNumber}`,
      generatedAt: now,
      version: "1.0.0",
      sourceOfTruth: true,
      description: "Complete single source of truth for all downstream modules",
      lastUpdated: now,
      status: order.status || 'ORDER_CREATED'
    },
    
    orderDetails: {
      id: order.id,
      status: order.status || 'ORDER_CREATED',
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
      customer: orderConfiguration.customerInfo,
      sinkSelection: orderConfiguration.sinkSelection,
      createdBy: {
        id: order.createdBy?.id,
        name: order.createdBy?.name,
        email: order.createdBy?.email,
        role: order.createdBy?.role
      }
    },
    
    // Complete configuration details
    configuration: buildConfigurationSection(orderConfiguration),
    
    // Complete BOM with enhanced analysis
    billOfMaterials: {
      source: "BOM Service API",
      generatedAt: now,
      hierarchical: bomData.hierarchical,
      flattened: bomData.flattened,
      totalItems: bomData.totalItems,
      
      // Enhanced structure
      ...categorizedBOM,
      flattenedWithRelationships: enhancedFlattened,
      
      // Manufacturing analysis
      manufacturingBreakdown: analyzeManufacturingRequirements(enhancedFlattened),
      procurementBreakdown: analyzeProcurementRequirements(enhancedFlattened),
      
      // Assembly tree for production planning
      assemblyTree: buildAssemblyTree(bomData.hierarchical),
      
      // Critical path analysis
      criticalComponents: identifyCriticalComponents(enhancedFlattened)
    },
    
    // Module-specific data sections
    manufacturingData: buildManufacturingData(enhancedFlattened, categorizedBOM),
    qualityControlData: buildQCData(enhancedFlattened, categorizedBOM),
    procurementData: buildProcurementData(enhancedFlattened, categorizedBOM),
    shippingData: buildShippingData(enhancedFlattened, categorizedBOM, orderConfiguration),
    
    // Workflow state tracking
    workflowState: {
      currentStage: 'ORDER_CREATED',
      nextSteps: ['BOM_REVIEW', 'PROCUREMENT_PLANNING', 'MANUFACTURING_SCHEDULING'],
      completedSteps: ['ORDER_CONFIGURATION', 'BOM_GENERATION'],
      milestones: {
        orderCreated: now,
        bomGenerated: now,
        procurementStarted: null,
        manufacturingStarted: null,
        qualityControlStarted: null,
        shippingStarted: null,
        orderCompleted: null
      },
      estimatedDelivery: calculateEstimatedDelivery(order.wantDate)
    }
  }
}

// Helper functions (reusing the enhanced logic from generate-complete-order-json.js)
function buildConfigurationSection(orderConfiguration: OrderConfiguration) {
  const buildNumber = orderConfiguration.sinkSelection.buildNumbers[0]
  const config = orderConfiguration.configurations[buildNumber]
  
  if (!config) return {}
  
  return {
    buildNumber,
    sinkModel: config.sinkModelId,
    dimensions: {
      width: config.width,
      length: config.length,
      unit: "inches"
    },
    structuralComponents: {
      legs: {
        typeId: config.legsTypeId,
        name: getLegTypeName(config.legsTypeId),
        type: "HEIGHT_ADJUSTABLE"
      },
      feet: {
        typeId: config.feetTypeId,
        name: getFeetTypeName(config.feetTypeId),
        type: "LEVELING_CASTERS"
      }
    },
    pegboard: {
      enabled: config.pegboard,
      type: config.pegboardTypeId,
      sizeBasedOnLength: config.length
    },
    storage: {
      drawersAndCompartments: config.drawersAndCompartments
    },
    basins: config.basins?.map((basin: any, index: number) => ({
      position: index + 1,
      type: basin.basinType,
      size: basin.basinSizePartNumber,
      addons: basin.addonIds
    })) || [],
    faucets: config.faucets || [],
    sprayers: config.sprayers || [],
    workflowDirection: config.workflowDirection
  }
}

// Import the analysis functions from our previous script
function categorizeBOMItems(hierarchical: any[]) {
  const categories: Record<string, any[]> = {}
  const byType: Record<string, any[]> = {}
  const byAssembly: Record<string, any> = {}
  
  function processItem(item: any, parentPath = '', level = 0) {
    const category = item.category || 'UNCATEGORIZED'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push({
      ...item,
      parentPath,
      level,
      fullPath: parentPath ? `${parentPath} → ${item.name}` : item.name
    })
    
    const type = item.type || 'UNKNOWN'
    if (!byType[type]) {
      byType[type] = []
    }
    byType[type].push(item)
    
    if (item.type === 'KIT' || item.type === 'COMPLEX' || item.components?.length > 0) {
      byAssembly[item.id] = {
        ...item,
        parentPath,
        level,
        componentCount: item.components?.length || 0
      }
    }
    
    const children = item.children || item.components || []
    children.forEach((child: any) => {
      const childPath = parentPath ? `${parentPath} → ${item.name}` : item.name
      processItem(child, childPath, level + 1)
    })
  }
  
  hierarchical.forEach(item => processItem(item))
  
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
  }
}

function addParentChildRelationships(flattened: any[]) {
  return flattened.map((item: any, index: number) => {
    const componentCount = item.components?.length || 0
    const hasChildren = componentCount > 0
    
    return {
      ...item,
      index: index + 1,
      parentPath: item.parentPath || 'Top Level',
      childCount: componentCount,
      isAssembly: hasChildren,
      isPart: !hasChildren,
      isTopLevel: !item.parentPath,
      depth: item.level || 0,
      manufacturingType: determineManufacturingType(item),
      procurementType: determineProcurementType(item),
      children: item.components?.map((child: any) => ({
        id: child.id,
        name: child.name,
        quantity: child.quantity,
        type: child.type,
        category: child.category
      })) || [],
      parentInfo: item.parentPath ? {
        path: item.parentPath,
        level: item.level || 0
      } : null
    }
  })
}

function determineManufacturingType(item: any): string {
  if (item.type === 'KIT') return 'ASSEMBLY_KIT'
  if (item.type === 'COMPLEX') return 'COMPLEX_ASSEMBLY'
  if (item.type === 'SIMPLE') return 'SIMPLE_ASSEMBLY'
  if (item.category === 'PART') return 'MANUFACTURED_PART'
  if (item.type === 'SERVICE_PART') return 'PURCHASED_PART'
  return 'COMPONENT'
}

function determineProcurementType(item: any): string {
  if (item.type === 'SERVICE_PART') return 'EXTERNAL_PURCHASE'
  if (item.category === 'PART' && item.id.includes('T2-')) return 'INTERNAL_MANUFACTURE'
  if (item.category === 'PART') return 'EXTERNAL_PURCHASE'
  return 'ASSEMBLY'
}

// Additional helper functions (simplified versions)
function analyzeManufacturingRequirements(flattened: any[]) {
  const breakdown = {
    totalParts: flattened.length,
    assemblies: flattened.filter(item => item.isAssembly).length,
    purchasedParts: flattened.filter(item => item.procurementType === 'EXTERNAL_PURCHASE').length,
    manufacturedParts: flattened.filter(item => item.procurementType === 'INTERNAL_MANUFACTURE').length,
    complexAssemblies: flattened.filter(item => item.manufacturingType === 'COMPLEX_ASSEMBLY').length,
    simpleAssemblies: flattened.filter(item => item.manufacturingType === 'SIMPLE_ASSEMBLY').length,
    kits: flattened.filter(item => item.manufacturingType === 'ASSEMBLY_KIT').length
  }
  return breakdown
}

function analyzeProcurementRequirements(flattened: any[]) {
  return {
    internalManufacture: flattened.filter(item => item.procurementType === 'INTERNAL_MANUFACTURE'),
    externalPurchase: flattened.filter(item => item.procurementType === 'EXTERNAL_PURCHASE'),
    assemblies: flattened.filter(item => item.procurementType === 'ASSEMBLY'),
    totalItems: flattened.length
  }
}

function buildAssemblyTree(hierarchical: any[]) {
  return hierarchical.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    category: item.category,
    quantity: item.quantity,
    hasChildren: (item.components?.length || 0) > 0,
    childCount: item.components?.length || 0,
    children: item.components?.map((child: any) => ({
      id: child.id,
      name: child.name,
      type: child.type,
      quantity: child.quantity,
      hasChildren: (child.components?.length || 0) > 0
    })) || []
  }))
}

function identifyCriticalComponents(flattened: any[]) {
  const critical: any[] = []
  
  flattened.forEach(item => {
    let criticalReasons: string[] = []
    
    if (item.name.toLowerCase().includes('electronic') || 
        item.name.toLowerCase().includes('control') ||
        item.id.includes('CTRL')) {
      criticalReasons.push('Electronic component')
    }
    
    if (item.category === 'BASIN_TYPE_KIT' || 
        item.name.toLowerCase().includes('basin')) {
      criticalReasons.push('Core sink functionality')
    }
    
    if (item.name.toLowerCase().includes('frame') ||
        item.category === 'SINK_BODY') {
      criticalReasons.push('Structural component')
    }
    
    if (item.type === 'SERVICE_PART') {
      criticalReasons.push('External dependency')
    }
    
    if (criticalReasons.length > 0) {
      critical.push({
        ...item,
        criticalReasons,
        priority: criticalReasons.includes('Electronic component') ? 'CRITICAL' : 'HIGH'
      })
    }
  })
  
  return critical.sort((a, b) => {
    const priorities: Record<string, number> = { 'CRITICAL': 3, 'HIGH': 2, 'NORMAL': 1 }
    return priorities[b.priority] - priorities[a.priority]
  })
}

function buildManufacturingData(flattened: any[], categorized: any) {
  return {
    assemblySequence: [
      { step: 1, category: "SYSTEM", description: "Documentation and manuals", estimatedTime: "30 min" },
      { step: 2, category: "SINK_BODY", description: "Main structural assembly", estimatedTime: "6-8 hours" },
      { step: 3, category: "SUB_ASSEMBLY", description: "Component sub-assemblies", estimatedTime: "2-3 hours" }
    ],
    estimatedLeadTime: "8-10 weeks",
    specialRequirements: [
      "Basin lighting installation",
      "Electronic control system setup", 
      "Height adjustable leg calibration"
    ]
  }
}

function buildQCData(flattened: any[], categorized: any) {
  return {
    inspectionPoints: [
      { stage: "Frame Assembly", checkpoints: ["Weld quality", "Dimensional accuracy"] },
      { stage: "Basin Installation", checkpoints: ["Alignment", "Seal integrity"] },
      { stage: "Electronic Systems", checkpoints: ["Wiring continuity", "Control box function"] }
    ],
    complianceStandards: ["ISO 13485:2016", "NSF/ANSI 2"]
  }
}

function buildProcurementData(flattened: any[], categorized: any) {
  const procurement = analyzeProcurementRequirements(flattened)
  return {
    ...procurement,
    leadTimeAnalysis: {
      internalParts: "2-3 weeks",
      purchasedParts: "4-6 weeks", 
      electronicComponents: "6-8 weeks"
    }
  }
}

function buildShippingData(flattened: any[], categorized: any, orderConfig: OrderConfiguration) {
  const buildNumber = orderConfig.sinkSelection.buildNumbers[0]
  const dimensions = orderConfig.configurations[buildNumber]
  
  return {
    estimatedWeight: "450 lbs",
    dimensions: {
      length: (dimensions?.length || 90) + 6,
      width: (dimensions?.width || 48) + 6,
      height: 42,
      unit: "inches"
    },
    specialHandling: ["Electronic components", "Heavy lifting required"]
  }
}

function calculateEstimatedDelivery(wantDate: Date): string {
  const delivery = new Date(wantDate)
  delivery.setDate(delivery.getDate() - 7) // 1 week before want date
  return delivery.toISOString()
}

function getLegTypeName(typeId: string): string {
  const legTypes: Record<string, string> = {
    'T2-DL14-KIT': 'DL14 Height Adjustable Legs Kit',
    'T2-FIXED-LEG-KIT': 'Fixed Legs Kit'
  }
  return legTypes[typeId] || typeId
}

function getFeetTypeName(typeId: string): string {
  const feetTypes: Record<string, string> = {
    'T2-LEVELING-CASTOR-475': 'Leveling Casters 475lbs',
    'T2-FIXED-FEET': 'Fixed Feet'
  }
  return feetTypes[typeId] || typeId
}

/**
 * Save order JSON to file system
 */
async function saveOrderJSON(orderId: string, jsonData: any): Promise<string> {
  const ordersDir = path.join(process.cwd(), 'orders', 'single-source-of-truth')
  
  console.log(`💾 Saving single source of truth JSON...`)
  console.log(`📂 Directory: ${ordersDir}`)
  
  // Ensure directory exists
  if (!fs.existsSync(ordersDir)) {
    console.log(`📁 Creating directory: ${ordersDir}`)
    fs.mkdirSync(ordersDir, { recursive: true })
  }
  
  const fileName = `order-${orderId}-source-of-truth.json`
  const filePath = path.join(ordersDir, fileName)
  
  console.log(`📝 Writing file: ${fileName}`)
  
  // Write JSON file
  const jsonString = JSON.stringify(jsonData, null, 2)
  fs.writeFileSync(filePath, jsonString)
  
  // Verify file was written successfully
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    console.log(`✅ File saved successfully`)
    console.log(`📏 File size: ${Math.round(stats.size / 1024)} KB`)
    console.log(`📅 Created: ${stats.birthtime.toISOString()}`)
    console.log(`📍 Full path: ${filePath}`)
  } else {
    throw new Error(`Failed to save JSON file: ${filePath}`)
  }
  
  return filePath
}

/**
 * Update workflow state in existing order JSON
 */
export async function updateOrderWorkflowState(
  orderId: string, 
  stage: string, 
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const filePath = path.join(
      process.cwd(), 
      'orders', 
      'single-source-of-truth', 
      `order-${orderId}-source-of-truth.json`
    )
    
    if (fs.existsSync(filePath)) {
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      
      // Update workflow state
      jsonData.workflowState.currentStage = stage
      jsonData.workflowState.milestones[stage.toLowerCase()] = new Date().toISOString()
      jsonData.metadata.lastUpdated = new Date().toISOString()
      
      // Add additional data if provided
      if (additionalData) {
        Object.assign(jsonData, additionalData)
      }
      
      // Save updated JSON
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2))
      
      console.log(`✅ Updated workflow state for order ${orderId}: ${stage}`)
    }
  } catch (error) {
    console.error(`❌ Error updating workflow state for order ${orderId}:`, error)
    throw error
  }
}

/**
 * Get order single source of truth JSON
 */
export async function getOrderSingleSourceOfTruth(orderId: string): Promise<any> {
  try {
    const filePath = path.join(
      process.cwd(), 
      'orders', 
      'single-source-of-truth', 
      `order-${orderId}-source-of-truth.json`
    )
    
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } else {
      throw new Error(`Single source of truth not found for order: ${orderId}`)
    }
  } catch (error) {
    console.error(`❌ Error reading single source of truth for order ${orderId}:`, error)
    throw error
  }
}