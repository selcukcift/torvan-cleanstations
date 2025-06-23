const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createHeightAdjustableTestOrder() {
  console.log('🧪 Creating test order with height-adjustable legs...');

  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.error('No admin user found');
      return;
    }

    // Create a test order with height-adjustable legs configuration
    const order = await prisma.order.create({
      data: {
        poNumber: 'PO-HEIGHT-ADJ-001',
        customerName: 'Height Adjustable Test Customer',
        projectName: 'Height Adjustable Legs Test',
        buildNumbers: ['HA-TEST-001'],
        salesPerson: 'Test Sales Rep',
        wantDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        language: 'English',
        createdById: adminUser.id,
        orderStatus: 'READY_FOR_PRE_QC',
        sinkConfigurations: {
          create: {
            buildNumber: 'HA-TEST-001',
            sinkModelId: 'T2-SINK-STANDARD',
            width: 72,
            length: 24,
            
            // HEIGHT-ADJUSTABLE LEGS (no -FH- suffix)
            legsTypeId: 'T2-DL14-KIT', // This should trigger lifter controls
            
            feetTypeId: 'T2-LEVELING-CASTOR-475',
            workflowDirection: 'LEFT_TO_RIGHT',
            pegboard: true,
            pegboardTypeId: 'T2-PEGBOARD-72'
          }
        },
        
        // Create basin configurations 
        basinConfigurations: {
          create: [
            {
              buildNumber: 'HA-TEST-001',
              basinTypeId: 'T2-BASIN-STANDARD',
              basinSizePartNumber: 'T2-BASIN-18X24',
              addonIds: ['DRAIN_BUTTON', 'BASIN_LIGHT']
            },
            {
              buildNumber: 'HA-TEST-001',
              basinTypeId: 'T2-BASIN-STANDARD', 
              basinSizePartNumber: 'T2-BASIN-18X24',
              addonIds: ['DRAIN_BUTTON', 'BASIN_LIGHT']
            }
          ]
        }
      },
      include: {
        sinkConfigurations: true,
        basinConfigurations: true,
        createdBy: true
      }
    });

    console.log('✅ Height-adjustable test order created successfully');
    console.log(`   - Order ID: ${order.id}`);
    console.log(`   - PO Number: ${order.poNumber}`);
    console.log(`   - Legs Type: ${order.sinkConfigurations[0].legsTypeId} (Height-Adjustable)`);
    console.log(`   - Status: ${order.orderStatus}`);
    console.log(`   - Basin Count: ${order.sinkConfigurations[0].basinConfigurations.length}`);
    console.log('   - ✅ Should show lifter controls in Pre-QC template');

    return order;

  } catch (error) {
    console.error('❌ Error creating height-adjustable test order:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test order creator
createHeightAdjustableTestOrder()
  .then(() => console.log('🎉 Height-adjustable test order creation completed'))
  .catch((error) => {
    console.error('💥 Height-adjustable test order creation failed:', error);
    process.exit(1);
  });