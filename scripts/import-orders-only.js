#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importOrdersOnly() {
  try {
    // Read the export file
    const exportData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'database-export.json'), 'utf8')
    );

    console.log('📥 Importing orders only...');
    console.log(`Found ${exportData.data.orders.length} orders in export file`);

    // Get the admin user ID to use as createdById
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('No admin user found in database');
    }

    // Check existing orders
    const existingOrders = await prisma.order.findMany({
      select: { id: true, poNumber: true }
    });
    console.log(`Currently have ${existingOrders.length} orders in database`);

    const existingPoNumbers = new Set(existingOrders.map(o => o.poNumber));

    // Import orders
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const order of exportData.data.orders) {
      if (existingPoNumbers.has(order.poNumber)) {
        console.log(`ℹ️  Order ${order.poNumber} already exists - skipping`);
        skippedCount++;
        continue;
      }

      try {
        // Prepare order data
        const orderData = {
          id: order.id,
          poNumber: order.poNumber,
          buildNumbers: order.buildNumbers || [],
          customerName: order.customerName,
          projectName: order.projectName,
          salesPerson: order.salesPerson,
          wantDate: order.wantDate ? new Date(order.wantDate) : null,
          notes: order.notes,
          language: order.language || 'EN',
          orderStatus: order.orderStatus || 'ORDER_CREATED',
          createdById: adminUser.id, // Use admin user as creator
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt)
        };

        const createdOrder = await prisma.order.create({ data: orderData });
        console.log(`✅ Imported order: ${order.poNumber}`);
        importedCount++;

        // Import sink configuration for this order if it exists
        const sinkConfigs = exportData.data.sinkConfigurations.filter(
          sc => sc.orderId === order.id
        );

        for (const sinkConfig of sinkConfigs) {
          try {
            const sinkConfigData = {
              id: sinkConfig.id,
              orderId: createdOrder.id,
              numOfSinks: sinkConfig.numOfSinks,
              basinsPerSink: sinkConfig.basinsPerSink || 1,
              createdAt: new Date(sinkConfig.createdAt),
              updatedAt: new Date(sinkConfig.updatedAt)
            };

            await prisma.sinkConfiguration.create({ data: sinkConfigData });
            console.log(`  ✅ Added sink configuration`);
          } catch (error) {
            console.error(`  ❌ Failed to add sink config:`, error.message);
          }
        }

        // Import basin configurations for this order
        const basinConfigs = exportData.data.basinConfigurations.filter(
          bc => bc.orderId === order.id || 
               exportData.data.sinkConfigurations
                 .filter(sc => sc.orderId === order.id)
                 .some(sc => bc.sinkConfigurationId === sc.id)
        );

        for (const basinConfig of basinConfigs) {
          try {
            // Find the sink configuration this basin belongs to
            const sinkConfigId = basinConfig.sinkConfigurationId || 
              sinkConfigs.find(sc => sc.id === basinConfig.sinkConfigurationId)?.id;

            if (!sinkConfigId) continue;

            const basinConfigData = {
              id: basinConfig.id,
              buildNumber: basinConfig.buildNumber,
              basinTypeId: basinConfig.basinTypeId,
              basinSizePartNumber: basinConfig.basinSizePartNumber,
              basinCount: basinConfig.basinCount || 1,
              addonIds: basinConfig.addonIds || [],
              sinkConfigurationId: sinkConfigId,
              customLength: basinConfig.customLength,
              customWidth: basinConfig.customWidth,
              customDepth: basinConfig.customDepth,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            await prisma.basinConfiguration.create({ data: basinConfigData });
            console.log(`  ✅ Added basin configuration: ${basinConfig.basinSizePartNumber}`);
          } catch (error) {
            console.error(`  ❌ Failed to add basin config:`, error.message);
          }
        }

        // Import faucet configurations
        const faucetConfigs = exportData.data.faucetConfigurations.filter(
          fc => exportData.data.sinkConfigurations
                 .filter(sc => sc.orderId === order.id)
                 .some(sc => fc.sinkConfigurationId === sc.id)
        );

        for (const faucetConfig of faucetConfigs) {
          try {
            const faucetConfigData = {
              id: faucetConfig.id,
              faucetPartNumber: faucetConfig.faucetPartNumber,
              quantity: faucetConfig.quantity || 1,
              sinkConfigurationId: faucetConfig.sinkConfigurationId,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            await prisma.faucetConfiguration.create({ data: faucetConfigData });
            console.log(`  ✅ Added faucet configuration: ${faucetConfig.faucetPartNumber}`);
          } catch (error) {
            console.error(`  ❌ Failed to add faucet config:`, error.message);
          }
        }

        // Import sprayer configurations
        const sprayerConfigs = exportData.data.sprayerConfigurations.filter(
          spc => exportData.data.sinkConfigurations
                  .filter(sc => sc.orderId === order.id)
                  .some(sc => spc.sinkConfigurationId === sc.id)
        );

        for (const sprayerConfig of sprayerConfigs) {
          try {
            const sprayerConfigData = {
              id: sprayerConfig.id,
              sprayerPartNumber: sprayerConfig.sprayerPartNumber,
              quantity: sprayerConfig.quantity || 1,
              sinkConfigurationId: sprayerConfig.sinkConfigurationId,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            await prisma.sprayerConfiguration.create({ data: sprayerConfigData });
            console.log(`  ✅ Added sprayer configuration: ${sprayerConfig.sprayerPartNumber}`);
          } catch (error) {
            console.error(`  ❌ Failed to add sprayer config:`, error.message);
          }
        }

      } catch (error) {
        console.error(`❌ Failed to import order ${order.poNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${importedCount} orders`);
    console.log(`   Skipped: ${skippedCount} orders (already exist)`);

    // Verify final count
    const finalCount = await prisma.order.count();
    console.log(`\nTotal orders in database: ${finalCount}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importOrdersOnly();