const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMissingSinkConfigs() {
  try {
    console.log('🔧 Adding missing sink configurations...');
    
    // Orders that need sink configurations
    const ordersNeedingSinkConfig = [
      'cmbqlyti60001tiaok05da1qm', // 1256396
      'cmbtqjvn10001tix4dx9szxt7'  // D14589693
    ];
    
    for (const orderId of ordersNeedingSinkConfig) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          sinkConfigurations: true,
          basinConfigurations: true
        }
      });
      
      if (!order) {
        console.log(`❌ Order ${orderId} not found`);
        continue;
      }
      
      console.log(`\\n📋 Processing order: ${order.poNumber}`);
      console.log(`Build numbers: [${order.buildNumbers.join(', ')}]`);
      
      const sinkConfigsToAdd = [];
      
      for (const buildNumber of order.buildNumbers) {
        const existingSinkConfig = order.sinkConfigurations.find(sc => sc.buildNumber === buildNumber);
        const basinConfigs = order.basinConfigurations.filter(bc => bc.buildNumber === buildNumber);
        
        if (!existingSinkConfig && basinConfigs.length > 0) {
          console.log(`  Adding sink config for build ${buildNumber}...`);
          
          // Determine sink model based on number of basins
          const basinCount = basinConfigs.length;
          const sinkModelId = basinCount === 1 ? 'T2-B1' : 
                             basinCount === 2 ? 'T2-B2' : 
                             basinCount === 3 ? 'T2-B3' : 'T2-B2'; // Default to T2-B2
          
          // Create basic sink configuration
          sinkConfigsToAdd.push({
            buildNumber: buildNumber,
            orderId: orderId,
            sinkModelId: sinkModelId,
            width: 48,
            length: basinCount === 1 ? 48 : basinCount === 2 ? 60 : 72, // Scale length with basin count
            legsTypeId: 'T2-DL27-FH-KIT',
            feetTypeId: 'T2-LEVELING-CASTOR-475',
            workflowDirection: 'LEFT_TO_RIGHT',
            pegboard: false,
            pegboardTypeId: null,
            pegboardColorId: null,
            hasDrawersAndCompartments: false,
            drawersAndCompartments: [],
            controlBoxId: null // Will be auto-selected during BOM generation
          });
          
          console.log(`    Created ${sinkModelId} config for ${basinCount} basin(s)`);
        }
      }
      
      if (sinkConfigsToAdd.length > 0) {
        const result = await prisma.sinkConfiguration.createMany({
          data: sinkConfigsToAdd
        });
        
        console.log(`  ✅ Added ${result.count} sink configuration(s)`);
      } else {
        console.log(`  ℹ️ No sink configurations needed`);
      }
    }
    
    console.log('\\n🎉 Missing sink configurations added successfully!');
    
    // Verify the fix
    console.log('\\n🔍 Verifying fixes...');
    for (const orderId of ordersNeedingSinkConfig) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          sinkConfigurations: true,
          basinConfigurations: true
        }
      });
      
      if (order) {
        let allBuildsHaveSinkConfigs = true;
        for (const buildNumber of order.buildNumbers) {
          const sinkConfig = order.sinkConfigurations.find(sc => sc.buildNumber === buildNumber);
          const basinConfigs = order.basinConfigurations.filter(bc => bc.buildNumber === buildNumber);
          
          if (!sinkConfig && basinConfigs.length > 0) {
            allBuildsHaveSinkConfigs = false;
            break;
          }
        }
        
        console.log(`  ${order.poNumber}: ${allBuildsHaveSinkConfigs ? '✅' : '❌'} BOM ready`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to add sink configurations:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMissingSinkConfigs();