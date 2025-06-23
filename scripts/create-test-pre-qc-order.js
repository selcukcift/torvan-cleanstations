const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestPreQCOrder() {
  console.log('🧪 Creating test order for Pre-QC testing...');

  try {
    // Find an existing user
    const user = await prisma.user.findFirst({
      where: { role: 'PRODUCTION_COORDINATOR' }
    });

    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      return;
    }

    // Create a test order with 2 basins and pegboard
    const order = await prisma.order.create({
      data: {
        poNumber: `TEST-PREQC-${Date.now()}`,
        customerName: 'Test Customer for Pre-QC',
        projectName: 'Pre-QC Testing Project',
        salesPerson: 'Test Sales Person',
        wantDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        language: 'English',
        orderStatus: 'READY_FOR_PRE_QC', // Set directly to Pre-QC status
        buildNumbers: ['B001'],
        createdById: user.id,
        
        // Create sink configuration
        sinkConfigurations: {
          create: {
            buildNumber: 'B001',
            sinkModelId: 'T2-SINK-STANDARD',
            width: 48,
            length: 90,
            legsTypeId: 'T2-DL14-KIT',
            feetTypeId: 'T2-LEVELING-CASTOR-475',
            pegboard: true,
            pegboardTypeId: 'T2-PEGBOARD-48',
            workflowDirection: 'LEFT_TO_RIGHT'
          }
        },
        
        // Create basin configurations for 2 basins
        basinConfigurations: {
          create: [
            {
              buildNumber: 'B001',
              basinTypeId: 'T2-BASIN-STANDARD',
              basinSizePartNumber: 'T2-BASIN-18X24',
              addonIds: ['DRAIN_BUTTON', 'BASIN_LIGHT']
            },
            {
              buildNumber: 'B001',
              basinTypeId: 'T2-BASIN-STANDARD',
              basinSizePartNumber: 'T2-BASIN-18X24',
              addonIds: ['DRAIN_BUTTON', 'BASIN_LIGHT']
            }
          ]
        }
      },
      include: {
        basinConfigurations: true,
        sinkConfigurations: true,
        createdBy: true
      }
    });

    console.log(`✅ Test order created: ${order.id}`);
    console.log(`   - PO Number: ${order.poNumber}`);
    console.log(`   - Status: ${order.orderStatus}`);
    console.log(`   - Basin Count: ${order.basinConfigurations.length}`);
    console.log(`   - Pegboard: ${order.sinkConfigurations[0]?.pegboard ? 'Yes' : 'No'}`);

    // Generate single source of truth via API call
    console.log('📋 Generating single source of truth...');
    try {
      // Call the API to generate single source of truth
      const response = await fetch(`http://localhost:3005/api/orders/${order.id}/regenerate-source-of-truth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`✅ Single source of truth generation triggered`);
      } else {
        console.log('⚠️  Single source of truth API call failed, but continuing...');
      }
    } catch (error) {
      console.log('⚠️  Could not call single source of truth API (server may not be running)');
    }

    console.log('\n🎯 Test Instructions:');
    console.log('1. Login as a QC_PERSON user');
    console.log('2. Check the QC Person Dashboard for this order');
    console.log('3. Navigate to the QC page for this order');
    console.log('4. Verify that the Pre-Production Check shows:');
    console.log('   - ✓ Pegboard items (since pegboard is enabled)');
    console.log('   - ✓ Leveling Castors items (not feet)');
    console.log('   - ✓ Basin 1 and Basin 2 sections');
    console.log('   - ✗ Basin 3 section (should be hidden)');
    console.log('   - ✓ Faucet location options for 2 basins');

    return order;

  } catch (error) {
    console.error('❌ Error creating test order:', error);
    throw error;
  }
}

// Create another test order with different configuration (3 basins, no pegboard, feet instead of castors)
async function createTestPreQCOrder3Basin() {
  console.log('🧪 Creating 3-basin test order for Pre-QC testing...');

  try {
    const user = await prisma.user.findFirst({
      where: { role: 'PRODUCTION_COORDINATOR' }
    });

    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      return;
    }

    const order = await prisma.order.create({
      data: {
        poNumber: `TEST-PREQC-3B-${Date.now()}`,
        customerName: 'Test Customer 3-Basin',
        projectName: 'Pre-QC Testing Project (3 Basin)',
        salesPerson: 'Test Sales Person',
        wantDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        language: 'English',
        orderStatus: 'READY_FOR_PRE_QC',
        buildNumbers: ['B002'],
        createdById: user.id,
        
        sinkConfigurations: {
          create: {
            buildNumber: 'B002',
            sinkModelId: 'T2-SINK-STANDARD',
            width: 72,
            length: 120,
            legsTypeId: 'T2-DL14-KIT',
            feetTypeId: 'T2-FIXED-FEET', // Feet instead of castors
            pegboard: false, // No pegboard
            pegboardTypeId: null,
            workflowDirection: 'LEFT_TO_RIGHT'
          }
        },
        
        // Create basin configurations for 3 basins
        basinConfigurations: {
          create: [
            {
              buildNumber: 'B002',
              basinTypeId: 'T2-BASIN-STANDARD',
              basinSizePartNumber: 'T2-BASIN-18X24',
              addonIds: ['DRAIN_BUTTON', 'BASIN_LIGHT']
            },
            {
              buildNumber: 'B002',
              basinTypeId: 'T2-BASIN-STANDARD',
              basinSizePartNumber: 'T2-BASIN-18X24',
              addonIds: ['DRAIN_BUTTON', 'BASIN_LIGHT']
            },
            {
              buildNumber: 'B002',
              basinTypeId: 'T2-BASIN-STANDARD',
              basinSizePartNumber: 'T2-BASIN-18X24',
              addonIds: ['DRAIN_BUTTON', 'BASIN_LIGHT']
            }
          ]
        }
      },
      include: {
        basinConfigurations: true,
        sinkConfigurations: true,
        createdBy: true
      }
    });

    console.log(`✅ 3-Basin test order created: ${order.id}`);
    console.log(`   - PO Number: ${order.poNumber}`);
    console.log(`   - Basin Count: ${order.basinConfigurations.length}`);
    console.log(`   - Pegboard: No`);
    console.log(`   - Feet Type: Fixed Feet`);

    // Generate single source of truth via API call  
    try {
      const response = await fetch(`http://localhost:3005/api/orders/${order.id}/regenerate-source-of-truth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`✅ Single source of truth generation triggered`);
      } else {
        console.log('⚠️  Single source of truth API call failed, but continuing...');
      }
    } catch (error) {
      console.log('⚠️  Could not call single source of truth API (server may not be running)');
    }

    console.log('\n🎯 Additional Test for 3-Basin Order:');
    console.log('   - ✗ Pegboard items (should be hidden)');
    console.log('   - ✓ Leveling Feet items (not castors)');
    console.log('   - ✓ Basin 1, Basin 2, and Basin 3 sections');
    console.log('   - ✓ Faucet location options for 3 basins');

    return order;

  } catch (error) {
    console.error('❌ Error creating 3-basin test order:', error);
    throw error;
  }
}

async function main() {
  try {
    await createTestPreQCOrder();
    console.log('\n' + '='.repeat(50));
    await createTestPreQCOrder3Basin();
    
    console.log('\n🎉 Test orders created successfully!');
    console.log('🔗 Navigate to the QC dashboard to test the dynamic Pre-QC checklist');
    
  } catch (error) {
    console.error('💥 Test setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();