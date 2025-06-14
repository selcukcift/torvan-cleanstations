const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMockOrder() {
  try {
    // Get a user to assign as creator (coordinator)
    const coordinator = await prisma.user.findFirst({
      where: { role: 'PRODUCTION_COORDINATOR' }
    });
    
    if (!coordinator) {
      console.log('❌ No coordinator found');
      return;
    }

    console.log(`🔍 Found coordinator: ${coordinator.fullName}`);

    // Create a mock order
    const mockOrder = await prisma.order.create({
      data: {
        poNumber: 'PO-2024-001',
        buildNumbers: ['BUILD-001', 'BUILD-002'],
        customerName: 'Metro General Hospital',
        projectName: 'ICU Renovation Project',
        salesPerson: 'Sarah Johnson',
        wantDate: new Date('2024-03-15'),
        notes: 'Rush order - hospital renovation timeline',
        language: 'EN',
        orderStatus: 'ORDER_CREATED',
        createdById: coordinator.id,
        
        // Create basin configurations
        basinConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-001',
              basinTypeId: 'T2-BSN-STANDARD',
              basinSizePartNumber: 'T2-BSN-24X18',
              basinCount: 2,
              addonIds: ['T2-BSN-EDR-KIT', 'T2-BSN-OVERFLOW']
            },
            {
              buildNumber: 'BUILD-002', 
              basinTypeId: 'T2-BSN-DEEP',
              basinSizePartNumber: 'T2-BSN-30X20',
              basinCount: 1,
              addonIds: ['T2-BSN-ESK-KIT']
            }
          ]
        },
        
        // Create sink configurations
        sinkConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-001',
              sinkModelId: 'T2-SINK-STANDARD',
              width: 72,
              length: 48,
              legsTypeId: 'T2-DL27-KIT',
              feetTypeId: 'T2-LEVELING-CASTOR-475',
              pegboard: true,
              pegboardTypeId: 'T2-ADW-PB-PERF',
              pegboardColorId: 'GREEN',
              controlBoxId: 'T2-CTRL-STD'
            },
            {
              buildNumber: 'BUILD-002',
              sinkModelId: 'T2-SINK-DELUXE', 
              width: 96,
              length: 60,
              legsTypeId: 'T2-DL14-KIT',
              feetTypeId: 'T2-SEISMIC-FEET',
              pegboard: true,
              pegboardTypeId: 'T2-ADW-PB-SOLID',
              pegboardColorId: 'BLUE',
              controlBoxId: 'T2-CTRL-DELUXE'
            }
          ]
        },
        
        // Create faucet configurations  
        faucetConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-001',
              faucetTypeId: 'T2-FAUCET-SINGLE',
              faucetQuantity: 1,
              faucetPlacement: 'Center'
            },
            {
              buildNumber: 'BUILD-002',
              faucetTypeId: 'T2-FAUCET-DUAL',
              faucetQuantity: 2, 
              faucetPlacement: 'Left and Right'
            }
          ]
        },
        
        // Create sprayer configurations
        sprayerConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-001',
              hasSpray: true,
              sprayerTypeIds: ['T2-SPRAY-STD'],
              sprayerQuantity: 1,
              sprayerLocations: ['Right Side']
            },
            {
              buildNumber: 'BUILD-002', 
              hasSpray: true,
              sprayerTypeIds: ['T2-SPRAY-ADV', 'T2-SPRAY-RINSE'],
              sprayerQuantity: 2,
              sprayerLocations: ['Left Side', 'Right Side']
            }
          ]
        },
        
        // Create selected accessories
        selectedAccessories: {
          create: [
            {
              buildNumber: 'BUILD-001',
              assemblyId: 'T2-ACC-TOWEL-DISPENSER',
              quantity: 2
            },
            {
              buildNumber: 'BUILD-001',
              assemblyId: 'T2-ACC-SOAP-DISPENSER', 
              quantity: 1
            },
            {
              buildNumber: 'BUILD-002',
              assemblyId: 'T2-ACC-GLOVE-DISPENSER',
              quantity: 3
            }
          ]
        }
      },
      include: {
        createdBy: true,
        basinConfigurations: true,
        sinkConfigurations: true, 
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true
      }
    });

    console.log('\n✅ Mock order created successfully!');
    console.log('=====================================');
    console.log('Order ID:', mockOrder.id);
    console.log('PO Number:', mockOrder.poNumber);
    console.log('Customer:', mockOrder.customerName);
    console.log('Project:', mockOrder.projectName);
    console.log('Sales Person:', mockOrder.salesPerson);
    console.log('Want Date:', mockOrder.wantDate.toISOString().split('T')[0]);
    console.log('Status:', mockOrder.orderStatus);
    console.log('Build Numbers:', mockOrder.buildNumbers.join(', '));
    console.log('\nConfigurations:');
    console.log('- Basin Configurations:', mockOrder.basinConfigurations.length);
    console.log('- Sink Configurations:', mockOrder.sinkConfigurations.length);
    console.log('- Faucet Configurations:', mockOrder.faucetConfigurations.length);
    console.log('- Sprayer Configurations:', mockOrder.sprayerConfigurations.length);
    console.log('- Selected Accessories:', mockOrder.selectedAccessories.length);
    console.log('Created by:', mockOrder.createdBy.fullName, `(${mockOrder.createdBy.role})`);
    
    return mockOrder;
    
  } catch (error) {
    console.error('❌ Error creating mock order:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createMockOrder()
    .then(() => {
      console.log('\n🎉 Mock order creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed to create mock order:', error);
      process.exit(1);
    });
}

module.exports = { createMockOrder };