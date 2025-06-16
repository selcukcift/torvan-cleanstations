const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixIncompleteOrders() {
  try {
    console.log('🔧 Analyzing and fixing incomplete orders...');
    
    // Find orders that are missing configurations
    const incompleteOrders = await prisma.order.findMany({
      include: {
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true
      }
    });
    
    console.log(`\nAnalyzing ${incompleteOrders.length} orders...\n`);
    
    let noConfigsCount = 0;
    let missingSinkConfigCount = 0;
    let missingBasinConfigCount = 0;
    let validOrdersCount = 0;
    
    const ordersToFix = [];
    
    for (const order of incompleteOrders) {
      // Check overall configuration presence
      const hasConfigurations = (order.sinkConfigurations?.length || 0) > 0 || 
                               (order.basinConfigurations?.length || 0) > 0;
      
      if (!hasConfigurations) {
        noConfigsCount++;
        ordersToFix.push({
          id: order.id,
          poNumber: order.poNumber,
          issue: 'NO_CONFIGURATIONS'
        });
        continue;
      }
      
      // Check each build number for specific issues
      let hasSinkConfigIssue = false;
      let hasBasinConfigIssue = false;
      
      for (const buildNumber of order.buildNumbers) {
        const sinkConfig = order.sinkConfigurations?.find(sc => sc.buildNumber === buildNumber);
        const basinConfigs = order.basinConfigurations?.filter(bc => bc.buildNumber === buildNumber) || [];
        
        if (!sinkConfig) {
          hasSinkConfigIssue = true;
        }
        
        if (!basinConfigs || basinConfigs.length === 0) {
          hasBasinConfigIssue = true;
        }
      }
      
      if (hasSinkConfigIssue) {
        missingSinkConfigCount++;
        ordersToFix.push({
          id: order.id,
          poNumber: order.poNumber,
          issue: 'MISSING_SINK_CONFIG'
        });
      } else if (hasBasinConfigIssue) {
        missingBasinConfigCount++;
        ordersToFix.push({
          id: order.id,
          poNumber: order.poNumber,
          issue: 'MISSING_BASIN_CONFIG'
        });
      } else {
        validOrdersCount++;
      }
    }
    
    console.log('📊 Order Analysis Results:');
    console.log(`  ✅ Valid orders (BOM ready): ${validOrdersCount}`);
    console.log(`  ❌ Orders with no configurations: ${noConfigsCount}`);
    console.log(`  ❌ Orders missing sink configs: ${missingSinkConfigCount}`);
    console.log(`  ❌ Orders missing basin configs: ${missingBasinConfigCount}`);
    console.log(`  📝 Total orders needing attention: ${ordersToFix.length}`);
    
    if (ordersToFix.length > 0) {
      console.log('\\n🔧 Orders that need fixing:');
      ordersToFix.forEach(order => {
        console.log(`  ${order.poNumber} (${order.id}) - ${order.issue}`);
      });
      
      console.log('\\n💡 Recommendations:');
      console.log('  1. For orders with NO_CONFIGURATIONS: These may be test orders or incomplete orders');
      console.log('  2. For orders with MISSING_SINK_CONFIG: Need to add sink configuration data');
      console.log('  3. For orders with MISSING_BASIN_CONFIG: Need to add basin configuration data');
      console.log('\\n  Consider adding validation during order creation to prevent these issues.');
    }
    
    // Show which orders are BOM-ready for testing
    const validOrders = incompleteOrders.filter(order => {
      const hasConfigurations = (order.sinkConfigurations?.length || 0) > 0 || 
                               (order.basinConfigurations?.length || 0) > 0;
      if (!hasConfigurations) return false;
      
      return order.buildNumbers.every(buildNumber => {
        const sinkConfig = order.sinkConfigurations?.find(sc => sc.buildNumber === buildNumber);
        const basinConfigs = order.basinConfigurations?.filter(bc => bc.buildNumber === buildNumber) || [];
        return sinkConfig && basinConfigs.length > 0;
      });
    });
    
    if (validOrders.length > 0) {
      console.log('\\n✅ Orders ready for BOM generation:');
      validOrders.slice(0, 3).forEach(order => {
        console.log(`  ${order.poNumber} (${order.id}) - ${order.buildNumbers.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixIncompleteOrders();