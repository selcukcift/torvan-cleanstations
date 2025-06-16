const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateOrderWithRealPartNumbers() {
  try {
    const orderId = 'cmbz2lz4k0001tizcn5zuzt9v';
    
    console.log('📋 Current Order Data:');
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        basinConfigurations: true,
        faucetConfigurations: true
      }
    });
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    
    console.log('Basin configurations:');
    order.basinConfigurations.forEach((basin, index) => {
      console.log(`  Basin ${index + 1}: basinSizePartNumber="${basin.basinSizePartNumber}"`);
    });
    
    console.log('Faucet configurations:');
    order.faucetConfigurations.forEach((faucet, index) => {
      console.log(`  Faucet ${index + 1}: faucetTypeId="${faucet.faucetTypeId}"`);
    });
    
    // Update basin configurations with real part number
    const basinUpdates = await prisma.basinConfiguration.updateMany({
      where: {
        orderId: orderId,
        basinSizePartNumber: 'T2-BSN-ESK-30-30-12' // The made-up ID
      },
      data: {
        basinSizePartNumber: 'T2-ADW-BASIN30X20X8' // Real part number from resources
      }
    });
    
    console.log(`✅ Updated ${basinUpdates.count} basin configurations`);
    
    // Update faucet configurations with real part number
    const faucetUpdates = await prisma.faucetConfiguration.updateMany({
      where: {
        orderId: orderId,
        faucetTypeId: 'T2-FAUCET-STANDARD' // The made-up ID
      },
      data: {
        faucetTypeId: 'T2-OA-STD-FAUCET-WB-KIT' // Real part number from resources
      }
    });
    
    console.log(`✅ Updated ${faucetUpdates.count} faucet configurations`);
    
    // Verify the updates
    console.log('\n📋 Updated Order Data:');
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        basinConfigurations: true,
        faucetConfigurations: true
      }
    });
    
    console.log('Updated basin configurations:');
    updatedOrder.basinConfigurations.forEach((basin, index) => {
      console.log(`  Basin ${index + 1}: basinSizePartNumber="${basin.basinSizePartNumber}"`);
    });
    
    console.log('Updated faucet configurations:');
    updatedOrder.faucetConfigurations.forEach((faucet, index) => {
      console.log(`  Faucet ${index + 1}: faucetTypeId="${faucet.faucetTypeId}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrderWithRealPartNumbers();