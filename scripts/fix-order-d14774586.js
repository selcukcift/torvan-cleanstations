const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixOrderD14774586() {
  try {
    console.log('🔧 Adding complete configuration data to Order D14774586...');
    
    const orderId = 'cmbz2lz4k0001tizcn5zuzt9v';
    const buildNumber = '9996';
    
    console.log(`\nOrder ID: ${orderId}`);
    console.log(`Build Number: ${buildNumber}`);
    
    // 1. Add Sink Configuration
    console.log('\n📐 Adding sink configuration...');
    const sinkConfig = await prisma.sinkConfiguration.create({
      data: {
        buildNumber: buildNumber,
        orderId: orderId,
        sinkModelId: 'T2-B2', // 2-basin sink
        width: 48,
        length: 60,
        legsTypeId: 'T2-DL27-FH-KIT',
        feetTypeId: 'T2-LEVELING-CASTOR-475',
        workflowDirection: 'LEFT_TO_RIGHT',
        pegboard: false,
        pegboardTypeId: null,
        pegboardColorId: null,
        hasDrawersAndCompartments: false,
        drawersAndCompartments: [],
        controlBoxId: null // Will be auto-selected during BOM generation
      }
    });
    console.log('✅ Sink configuration added:', sinkConfig.sinkModelId);
    
    // 2. Add Basin Configurations (2 basins for T2-B2)
    console.log('\n🪣 Adding basin configurations...');
    const basinConfigs = await prisma.basinConfiguration.createMany({
      data: [
        {
          buildNumber: buildNumber,
          orderId: orderId,
          basinTypeId: 'T2-BSN-ESK-KIT',
          basinSizePartNumber: 'T2-BSN-ESK-30-30-12',
          basinCount: 1,
          addonIds: [],
          customDepth: null,
          customLength: null,
          customWidth: null
        },
        {
          buildNumber: buildNumber,
          orderId: orderId,
          basinTypeId: 'T2-BSN-EDR-KIT',
          basinSizePartNumber: 'T2-BSN-EDR-30-30-12',
          basinCount: 1,
          addonIds: [],
          customDepth: null,
          customLength: null,
          customWidth: null
        }
      ]
    });
    console.log(`✅ Basin configurations added: ${basinConfigs.count} basins`);
    console.log('  - 1 E-Sink (T2-BSN-ESK-KIT)');
    console.log('  - 1 E-Drain (T2-BSN-EDR-KIT)');
    
    // 3. Add Faucet Configuration
    console.log('\n🚿 Adding faucet configuration...');
    const faucetConfig = await prisma.faucetConfiguration.create({
      data: {
        buildNumber: buildNumber,
        orderId: orderId,
        faucetTypeId: 'T2-FAUCET-STANDARD',
        faucetQuantity: 1,
        faucetPlacement: 'Center'
      }
    });
    console.log('✅ Faucet configuration added:', faucetConfig.faucetTypeId);
    
    // 4. Add Sprayer Configuration (optional but helps with completeness)
    console.log('\n💨 Adding sprayer configuration...');
    const sprayerConfig = await prisma.sprayerConfiguration.create({
      data: {
        buildNumber: buildNumber,
        orderId: orderId,
        hasSpray: false,
        sprayerTypeIds: [],
        sprayerQuantity: 0,
        sprayerLocations: []
      }
    });
    console.log('✅ Sprayer configuration added (no spray)');
    
    console.log('\n🎉 Order D14774586 configuration complete!');
    
    // Verify the configuration
    console.log('\n🔍 Verifying configuration...');
    const verifyOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true
      }
    });
    
    console.log('Verification Results:');
    console.log('  Sink configurations:', verifyOrder.sinkConfigurations.length);
    console.log('  Basin configurations:', verifyOrder.basinConfigurations.length);
    console.log('  Faucet configurations:', verifyOrder.faucetConfigurations.length);
    console.log('  Sprayer configurations:', verifyOrder.sprayerConfigurations.length);
    
    // Test BOM validation logic
    const sinkConfig_verify = verifyOrder.sinkConfigurations.find(sc => sc.buildNumber === buildNumber);
    const basinConfigs_verify = verifyOrder.basinConfigurations.filter(bc => bc.buildNumber === buildNumber);
    
    if (sinkConfig_verify && basinConfigs_verify.length > 0) {
      console.log('\n✅ BOM VALIDATION TEST: PASS');
      console.log('✅ Order D14774586 is now ready for BOM generation');
      
      // Show expected control box
      const eSinks = basinConfigs_verify.filter(b => b.basinTypeId === 'T2-BSN-ESK-KIT' || b.basinTypeId === 'T2-BSN-ESK-DI-KIT').length;
      const eDrains = basinConfigs_verify.filter(b => b.basinTypeId === 'T2-BSN-EDR-KIT').length;
      
      console.log(`Basin composition: ${eDrains} E-Drain + ${eSinks} E-Sink`);
      console.log('Expected control box: T2-CTRL-EDR1-ESK1');
    } else {
      console.log('\n❌ BOM VALIDATION TEST: FAIL');
    }
    
  } catch (error) {
    console.error('❌ Failed to fix order:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixOrderD14774586();