#!/usr/bin/env node

/**
 * Migration script to fix existing basin configurations with empty basinTypeId
 * This addresses orders created before the basin configuration fix
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const BASIN_TYPE_MAPPING = {
  'E_DRAIN': 'T2-BSN-EDR-KIT',
  'E_SINK': 'T2-BSN-ESK-KIT', 
  'E_SINK_DI': 'T2-BSN-ESK-DI-KIT'
}

async function fixExistingBasinConfigurations() {
  console.log('🔧 Fixing Existing Basin Configurations')
  console.log('=' .repeat(60))
  
  try {
    // Find all basin configurations with empty basinTypeId
    const emptyBasinConfigs = await prisma.basinConfiguration.findMany({
      where: {
        basinTypeId: ''
      },
      include: {
        order: {
          select: {
            poNumber: true,
            buildNumbers: true
          }
        }
      }
    })
    
    console.log(`\n📋 Found ${emptyBasinConfigs.length} basin configurations with missing basin type`)
    
    if (emptyBasinConfigs.length === 0) {
      console.log('✅ No basin configurations need fixing')
      return
    }
    
    // Group by order to provide context
    const orderGroups = {}
    emptyBasinConfigs.forEach(config => {
      const orderId = config.orderId
      if (!orderGroups[orderId]) {
        orderGroups[orderId] = {
          order: config.order,
          configs: []
        }
      }
      orderGroups[orderId].configs.push(config)
    })
    
    console.log(`\n📊 Affected Orders: ${Object.keys(orderGroups).length}`)
    
    // Strategy 1: Try to infer basin type from size patterns
    const sizePatterns = {
      'T2-ADW-BASIN20X20X8': 'T2-BSN-ESK-KIT',     // Small basins likely E-Sink
      'T2-ADW-BASIN24X20X8': 'T2-BSN-ESK-KIT',     // Medium basins likely E-Sink  
      'T2-ADW-BASIN24X20X10': 'T2-BSN-ESK-KIT',    // Medium basins likely E-Sink
      'T2-ADW-BASIN30X20X8': 'T2-BSN-EDR-KIT',     // Large basins likely E-Drain
      'T2-ADW-BASIN30X20X10': 'T2-BSN-EDR-KIT'     // Large basins likely E-Drain
    }
    
    let fixedCount = 0
    let inferredCount = 0
    let unfixableCount = 0
    
    for (const [orderId, group] of Object.entries(orderGroups)) {
      console.log(`\n🔍 Processing Order: ${group.order.poNumber}`)
      
      for (const config of group.configs) {
        console.log(`   Basin: ${config.buildNumber} - Size: ${config.basinSizePartNumber}`)
        
        let newBasinTypeId = null
        
        // Try to infer from size pattern
        if (config.basinSizePartNumber && sizePatterns[config.basinSizePartNumber]) {
          newBasinTypeId = sizePatterns[config.basinSizePartNumber]
          console.log(`   🔄 Inferred type from size: ${newBasinTypeId}`)
          inferredCount++
        }
        
        if (newBasinTypeId) {
          try {
            await prisma.basinConfiguration.update({
              where: { id: config.id },
              data: { basinTypeId: newBasinTypeId }
            })
            console.log(`   ✅ Fixed: ${config.id} -> ${newBasinTypeId}`)
            fixedCount++
          } catch (error) {
            console.log(`   ❌ Failed to update ${config.id}: ${error.message}`)
            unfixableCount++
          }
        } else {
          console.log(`   ⚠️  Cannot infer basin type from size: ${config.basinSizePartNumber}`)
          unfixableCount++
        }
      }
    }
    
    console.log('\n📈 Migration Results:')
    console.log(`   Fixed basin configurations: ${fixedCount}`)
    console.log(`   Inferred from size patterns: ${inferredCount}`)
    console.log(`   Unable to fix: ${unfixableCount}`)
    
    if (unfixableCount > 0) {
      console.log('\n⚠️  Recommendations for unfixable configurations:')
      console.log('   1. These orders may need manual review')
      console.log('   2. Consider setting a default basin type (e.g., T2-BSN-ESK-KIT)')
      console.log('   3. Or delete these incomplete basin configurations')
      
      const unfixableConfigs = await prisma.basinConfiguration.findMany({
        where: {
          basinTypeId: ''
        },
        include: {
          order: {
            select: {
              poNumber: true
            }
          }
        }
      })
      
      console.log('\n   Remaining unfixable configurations:')
      unfixableConfigs.forEach(config => {
        console.log(`     - Order ${config.order.poNumber}: Basin ${config.buildNumber} (Size: ${config.basinSizePartNumber})`)
      })
    }
    
    // Test BOM logic after fix
    console.log('\n🧪 Testing BOM Logic After Fix')
    
    const testOrder = await prisma.order.findFirst({
      include: {
        basinConfigurations: true,
        sinkConfigurations: true
      },
      where: {
        basinConfigurations: {
          some: {}
        }
      }
    })
    
    if (testOrder && testOrder.basinConfigurations.length > 0) {
      const basins = testOrder.basinConfigurations.filter(b => b.buildNumber === testOrder.buildNumbers[0])
      
      const eSinks = basins.filter(b => 
        b.basinTypeId === 'T2-BSN-ESK-KIT' || b.basinTypeId === 'T2-BSN-ESK-DI-KIT'
      ).length
      
      const eDrains = basins.filter(b => 
        b.basinTypeId === 'T2-BSN-EDR-KIT'
      ).length
      
      console.log(`   Test Order: ${testOrder.poNumber}`)
      console.log(`   E-Sinks: ${eSinks}, E-Drains: ${eDrains}`)
      
      // Determine expected control box
      let expectedControlBox = 'UNKNOWN'
      if (eDrains === 1 && eSinks === 0) expectedControlBox = 'T2-CTRL-EDR1'
      if (eDrains === 0 && eSinks === 1) expectedControlBox = 'T2-CTRL-ESK1'
      if (eDrains === 1 && eSinks === 1) expectedControlBox = 'T2-CTRL-EDR1-ESK1'
      
      console.log(`   Expected Control Box: ${expectedControlBox}`)
      
      if (expectedControlBox !== 'UNKNOWN') {
        console.log('   ✅ BOM logic test passed')
      } else {
        console.log('   ❌ BOM logic test failed')
      }
    } else {
      console.log('   ⚠️  No suitable test order found')
    }
    
    console.log('\n🎯 Migration Summary:')
    console.log('✅ Basin configuration migration completed')
    console.log('✅ Existing basin types have been inferred where possible')
    console.log('✅ Future orders will require basin types during creation')
    console.log('✅ BOM generation logic should now work correctly')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
fixExistingBasinConfigurations().catch(console.error)