#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importMissingOrders() {
  try {
    // Read the export file
    const exportData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'database-export.json'), 'utf8')
    );

    console.log('📥 Importing missing orders...');
    console.log(`Found ${exportData.data.orders.length} orders in export file`);

    // Check existing orders
    const existingOrders = await prisma.order.findMany({
      select: { id: true, poNumber: true }
    });
    console.log(`Currently have ${existingOrders.length} orders in database`);

    const existingOrderIds = new Set(existingOrders.map(o => o.id));
    const existingPoNumbers = new Set(existingOrders.map(o => o.poNumber));

    // Import orders
    let importedCount = 0;
    for (const order of exportData.data.orders) {
      if (!existingOrderIds.has(order.id) && !existingPoNumbers.has(order.poNumber)) {
        try {
          // Convert dates and map fields
          const { orderId, ...orderFields } = order; // Remove orderId if present
          const orderData = {
            ...orderFields,
            wantDate: order.wantDate ? new Date(order.wantDate) : null,
            orderStatus: order.orderStatus || 'CREATED',
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.updatedAt)
          };

          await prisma.order.create({ data: orderData });
          console.log(`✅ Imported order: ${order.poNumber}`);
          importedCount++;
        } catch (error) {
          console.error(`❌ Failed to import order ${order.poNumber}:`, error.message);
        }
      } else {
        console.log(`ℹ️  Order ${order.poNumber} already exists`);
      }
    }

    // Import sink configurations
    console.log('\n📥 Importing sink configurations...');
    for (const config of exportData.data.sinkConfigurations) {
      try {
        const configData = {
          ...config,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt)
        };
        
        await prisma.sinkConfiguration.upsert({
          where: { id: config.id },
          update: configData,
          create: configData
        });
        console.log(`✅ Imported sink config for order: ${config.orderId}`);
      } catch (error) {
        console.error(`❌ Failed to import sink config:`, error.message);
      }
    }

    // Import basin configurations
    console.log('\n📥 Importing basin configurations...');
    for (const config of exportData.data.basinConfigurations) {
      try {
        const configData = {
          ...config,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt)
        };
        
        await prisma.basinConfiguration.upsert({
          where: { id: config.id },
          update: configData,
          create: configData
        });
        console.log(`✅ Imported basin config: ${config.basinPartNumber}`);
      } catch (error) {
        console.error(`❌ Failed to import basin config:`, error.message);
      }
    }

    // Import faucet configurations
    console.log('\n📥 Importing faucet configurations...');
    for (const config of exportData.data.faucetConfigurations) {
      try {
        const configData = {
          ...config,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt)
        };
        
        await prisma.faucetConfiguration.upsert({
          where: { id: config.id },
          update: configData,
          create: configData
        });
        console.log(`✅ Imported faucet config: ${config.faucetPartNumber}`);
      } catch (error) {
        console.error(`❌ Failed to import faucet config:`, error.message);
      }
    }

    // Import sprayer configurations
    console.log('\n📥 Importing sprayer configurations...');
    for (const config of exportData.data.sprayerConfigurations) {
      try {
        const configData = {
          ...config,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt)
        };
        
        await prisma.sprayerConfiguration.upsert({
          where: { id: config.id },
          update: configData,
          create: configData
        });
        console.log(`✅ Imported sprayer config: ${config.sprayerPartNumber}`);
      } catch (error) {
        console.error(`❌ Failed to import sprayer config:`, error.message);
      }
    }

    // Import selected accessories
    console.log('\n📥 Importing selected accessories...');
    for (const accessory of exportData.data.selectedAccessories) {
      try {
        const accessoryData = {
          ...accessory,
          createdAt: new Date(accessory.createdAt),
          updatedAt: new Date(accessory.updatedAt)
        };
        
        await prisma.selectedAccessory.create({ data: accessoryData });
        console.log(`✅ Imported accessory for sink config: ${accessory.sinkConfigurationId}`);
      } catch (error) {
        console.error(`❌ Failed to import accessory:`, error.message);
      }
    }

    console.log(`\n✅ Import complete! Imported ${importedCount} new orders.`);

    // Verify final count
    const finalCount = await prisma.order.count();
    console.log(`Total orders in database: ${finalCount}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importMissingOrders();