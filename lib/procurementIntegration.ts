import { PrismaClient } from '@prisma/client'
import { getOrderSingleSourceOfTruth, updateOrderWorkflowState } from './orderSingleSourceOfTruth'

const prisma = new PrismaClient()

/**
 * Get procurement data by merging Single Source of Truth analysis with tracking data
 */
export async function getIntegratedProcurementData(orderId: string) {
  try {
    // 1. Get the Single Source of Truth data
    const singleSourceOfTruth = await getOrderSingleSourceOfTruth(orderId)
    
    // 2. Get the order's procurement data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        procurementData: true,
        orderStatus: true
      }
    })
    
    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }
    
    // 3. Extract procurement analysis from Single Source of Truth
    const procurementAnalysis = singleSourceOfTruth.procurementData || {}
    const bomItems = singleSourceOfTruth.billOfMaterials?.flattened || []
    
    // 4. Extract operational data
    const operationalData = (order.procurementData as any) || {
      analysisCompleted: false,
      outsourcedParts: [],
      missingParts: []
    }
    
    // 5. Identify legs and feet parts from BOM
    const LEGS_PATTERNS = [
      "T2-DL27-KIT",
      "T2-DL14-KIT", 
      "T2-LC1-KIT",
      "T2-DL27-FH-KIT",
      "T2-DL14-FH-KIT",
    ]
    
    const FEET_PATTERNS = [
      "T2-LEVELING-CASTOR-475",
      "T2-SEISMIC-FEET",
    ]
    
    const legsAndFeetParts = bomItems.filter((item: any) => {
      const partNumber = item.id || item.assemblyId || item.partNumber || ""
      return LEGS_PATTERNS.includes(partNumber) || FEET_PATTERNS.includes(partNumber)
    }).map((item: any) => {
      const partNumber = item.id || item.assemblyId || item.partNumber || ""
      const isLeg = LEGS_PATTERNS.includes(partNumber)
      
      return {
        id: item.id || partNumber,
        partNumber,
        partName: item.name || item.description || partNumber,
        quantity: item.quantity || 1,
        category: isLeg ? "LEGS" : "FEET",
        source: "SINGLE_SOURCE_OF_TRUTH"
      }
    })
    
    // 6. Merge with tracked outsourced parts
    const mergedOutsourcedParts = mergeParts(legsAndFeetParts, operationalData.outsourcedParts || [])
    
    // 7. Build integrated procurement data
    return {
      // From Single Source of Truth
      analysis: {
        internalManufacture: procurementAnalysis.internalManufacture || [],
        externalPurchase: procurementAnalysis.externalPurchase || [],
        leadTimeAnalysis: procurementAnalysis.leadTimeAnalysis || {},
        totalItems: procurementAnalysis.totalItems || 0,
        criticalComponents: singleSourceOfTruth.billOfMaterials?.criticalComponents || []
      },
      
      // From operational tracking
      tracking: {
        analysisCompleted: operationalData.analysisCompleted,
        outsourcedParts: mergedOutsourcedParts,
        missingParts: operationalData.missingParts || [],
        lastUpdated: operationalData.lastUpdated,
        lastUpdatedBy: operationalData.lastUpdatedBy
      },
      
      // Combined view
      procurementItems: mergedOutsourcedParts,
      orderStatus: order.orderStatus,
      
      // Summary
      summary: {
        totalPartsForOutsourcing: legsAndFeetParts.length,
        partsSent: mergedOutsourcedParts.filter((p: any) => p.status === 'SENT').length,
        partsReceived: mergedOutsourcedParts.filter((p: any) => p.status === 'RECEIVED').length,
        partsPending: mergedOutsourcedParts.filter((p: any) => p.status === 'PENDING' || !p.status).length
      }
    }
    
  } catch (error) {
    console.error('Error getting integrated procurement data:', error)
    throw error
  }
}

/**
 * Merge parts from BOM with tracked outsourced parts
 */
function mergeParts(bomParts: any[], trackedParts: any[]) {
  const merged = new Map()
  
  // Start with BOM parts
  bomParts.forEach(part => {
    merged.set(part.partNumber, {
      ...part,
      status: 'PENDING'
    })
  })
  
  // Override with tracked data
  trackedParts.forEach(tracked => {
    if (merged.has(tracked.partNumber)) {
      merged.set(tracked.partNumber, {
        ...merged.get(tracked.partNumber),
        ...tracked
      })
    } else {
      // Part not in BOM but tracked (shouldn't happen, but handle gracefully)
      merged.set(tracked.partNumber, tracked)
    }
  })
  
  return Array.from(merged.values())
}

/**
 * Update procurement milestone in Single Source of Truth
 */
export async function updateProcurementMilestone(orderId: string, milestone: string, additionalData?: any) {
  try {
    // Map procurement actions to workflow stages
    const milestoneMapping: Record<string, string> = {
      'PARTS_SENT': 'PROCUREMENT_STARTED',
      'PARTS_RECEIVED': 'MANUFACTURING_SCHEDULING',
      'ANALYSIS_COMPLETE': 'PROCUREMENT_PLANNING'
    }
    
    const workflowStage = milestoneMapping[milestone]
    if (workflowStage) {
      await updateOrderWorkflowState(orderId, workflowStage, {
        procurement: additionalData
      })
    }
    
    console.log(`✅ Updated procurement milestone: ${milestone} -> ${workflowStage}`)
  } catch (error) {
    console.error('Error updating procurement milestone:', error)
    // Non-critical error, don't throw
  }
}

/**
 * Check if order needs procurement based on Single Source of Truth
 */
export async function checkProcurementNeeded(orderId: string): Promise<boolean> {
  try {
    const singleSourceOfTruth = await getOrderSingleSourceOfTruth(orderId)
    const bomItems = singleSourceOfTruth.billOfMaterials?.flattened || []
    
    // Check if any legs or feet parts exist in BOM
    const PROCUREMENT_PATTERNS = [
      "T2-DL27-KIT",
      "T2-DL14-KIT", 
      "T2-LC1-KIT",
      "T2-DL27-FH-KIT",
      "T2-DL14-FH-KIT",
      "T2-LEVELING-CASTOR-475",
      "T2-SEISMIC-FEET"
    ]
    
    return bomItems.some((item: any) => {
      const partNumber = item.id || item.assemblyId || item.partNumber || ""
      return PROCUREMENT_PATTERNS.includes(partNumber)
    })
  } catch (error) {
    console.error('Error checking procurement need:', error)
    return false
  }
}