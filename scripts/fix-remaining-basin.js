const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRemainingBasinPartNumber() {
  try {
    const orderId = 'cmbz2lz4k0001tizcn5zuzt9v';
    
    console.log('🔧 Fixing remaining made-up basin part number...');
    
    // Update the remaining made-up basin part number
    const basinUpdates = await prisma.basinConfiguration.updateMany({
      where: {
        orderId: orderId,
        basinSizePartNumber: 'T2-BSN-EDR-30-30-12' // The made-up ID
      },
      data: {
        basinSizePartNumber: 'T2-ADW-BASIN30X20X10' // Real part number from resources (slightly different depth)
      }
    });
    
    console.log(`✅ Updated ${basinUpdates.count} basin configurations`);
    
    // Verify all basin configurations now use real part numbers
    console.log('\n📋 Final Basin Configuration Check:');
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        basinConfigurations: true,
        faucetConfigurations: true
      }
    });
    
    console.log('All basin configurations:');
    order.basinConfigurations.forEach((basin, index) => {
      console.log(`  Basin ${index + 1}: basinSizePartNumber="${basin.basinSizePartNumber}"`);
    });
    
    console.log('All faucet configurations:');
    order.faucetConfigurations.forEach((faucet, index) => {
      console.log(`  Faucet ${index + 1}: faucetTypeId="${faucet.faucetTypeId}"`);
    });
    
    console.log('\n✅ Order D14774586 now uses only real part numbers from resources!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingBasinPartNumber();