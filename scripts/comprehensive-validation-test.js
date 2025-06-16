const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Comprehensive validation test with edge case checking
async function comprehensiveValidationTest() {
  try {
    console.log('🔍 Comprehensive validation test for Order D14774586...');
    
    const orderId = 'cmbz2lz4k0001tizcn5zuzt9v';
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true
      }
    });
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    
    console.log(`\\n📋 Order: ${order.poNumber}`);
    console.log(`Build numbers: [${order.buildNumbers.join(', ')}]`);
    
    // Check individual field validation issues
    console.log('\\n🔍 Detailed field validation:');
    
    // Customer info validation
    console.log('\\n👤 Customer Info:');
    console.log(`  customerName: "${order.customerName}" (length: ${order.customerName?.length || 0})`);
    console.log(`  poNumber: "${order.poNumber}" (length: ${order.poNumber?.length || 0})`);
    console.log(`  salesPerson: "${order.salesPerson}" (length: ${order.salesPerson?.length || 0})`);
    console.log(`  language: "${order.language}"`);
    console.log(`  wantDate: ${order.wantDate}`);
    console.log(`  projectName: "${order.projectName || 'null'}"`);
    console.log(`  notes: "${order.notes || 'null'}"`);
    
    // Check for potential validation issues
    const validationIssues = [];
    
    if (!order.customerName || order.customerName.length === 0) {
      validationIssues.push('customerName is required');
    }
    
    if (!order.poNumber || order.poNumber.length === 0) {
      validationIssues.push('poNumber is required');
    }
    
    if (!order.salesPerson || order.salesPerson.length === 0) {
      validationIssues.push('salesPerson is required');
    }
    
    if (!['EN', 'FR', 'ES'].includes(order.language)) {
      validationIssues.push(`language "${order.language}" is not valid (must be EN, FR, or ES)`);
    }
    
    if (validationIssues.length > 0) {
      console.log('\\n❌ Customer info validation issues:');
      validationIssues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('\\n✅ Customer info validation: PASS');
    }
    
    // Sink selection validation
    console.log('\\n🚿 Sink Selection:');
    const sinkConfig = order.sinkConfigurations[0];
    if (sinkConfig) {
      console.log(`  sinkModelId: "${sinkConfig.sinkModelId}"`);
      console.log(`  quantity: ${order.buildNumbers.length}`);
      console.log(`  buildNumbers: [${order.buildNumbers.join(', ')}]`);
      
      if (!sinkConfig.sinkModelId) {
        console.log('  ❌ sinkModelId is required');
      } else if (order.buildNumbers.length < 1) {
        console.log('  ❌ quantity must be at least 1');
      } else if (!order.buildNumbers || order.buildNumbers.length === 0) {
        console.log('  ❌ buildNumbers array cannot be empty');
      } else {
        console.log('  ✅ Sink selection validation: PASS');
      }
    } else {
      console.log('  ❌ No sink configuration found');
    }
    
    // Configuration validation
    console.log('\\n🔧 Configuration Details:');
    for (const buildNumber of order.buildNumbers) {
      console.log(`\\n  Build ${buildNumber}:`);
      
      const sinkConfig = order.sinkConfigurations.find(sc => sc.buildNumber === buildNumber);
      const basinConfigs = order.basinConfigurations.filter(bc => bc.buildNumber === buildNumber);
      const faucetConfigs = order.faucetConfigurations.filter(fc => fc.buildNumber === buildNumber);
      
      if (sinkConfig) {
        console.log(`    sinkModelId: "${sinkConfig.sinkModelId}"`);
        console.log(`    width: ${sinkConfig.width} (type: ${typeof sinkConfig.width})`);
        console.log(`    length: ${sinkConfig.length} (type: ${typeof sinkConfig.length})`);
        console.log(`    legsTypeId: "${sinkConfig.legsTypeId}"`);
        console.log(`    feetTypeId: "${sinkConfig.feetTypeId}"`);
        console.log(`    pegboard: ${sinkConfig.pegboard} (type: ${typeof sinkConfig.pegboard})`);
        console.log(`    controlBoxId: ${sinkConfig.controlBoxId}`);
        
        // Check basin configurations
        console.log(`    basins: ${basinConfigs.length} items`);
        basinConfigs.forEach((basin, index) => {
          console.log(`      Basin ${index + 1}:`);
          console.log(`        basinTypeId: "${basin.basinTypeId}"`);
          console.log(`        basinSizePartNumber: "${basin.basinSizePartNumber}"`);
          console.log(`        addonIds: [${basin.addonIds?.join(', ') || ''}] (length: ${basin.addonIds?.length || 0})`);
          
          if (!basin.basinTypeId) {
            console.log(`        ❌ basinTypeId is missing`);
          }
        });
        
        // Check faucet configurations
        console.log(`    faucets: ${faucetConfigs.length} items`);
        faucetConfigs.forEach((faucet, index) => {
          console.log(`      Faucet ${index + 1}:`);
          console.log(`        faucetTypeId: "${faucet.faucetTypeId}"`);
          console.log(`        quantity: ${faucet.faucetQuantity} (type: ${typeof faucet.faucetQuantity})`);
          console.log(`        placement: "${faucet.faucetPlacement}"`);
        });
      } else {
        console.log(`    ❌ No sink configuration for build ${buildNumber}`);
      }
    }
    
    // Accessories validation
    console.log('\\n🎯 Accessories:');
    const accessories = order.selectedAccessories || [];
    console.log(`  Total accessories: ${accessories.length}`);
    
    for (const buildNumber of order.buildNumbers) {
      const buildAccessories = accessories.filter(acc => acc.buildNumber === buildNumber);
      console.log(`  Build ${buildNumber}: ${buildAccessories.length} accessories`);
      
      buildAccessories.forEach((acc, index) => {
        console.log(`    Accessory ${index + 1}:`);
        console.log(`      assemblyId: "${acc.assemblyId}"`);
        console.log(`      quantity: ${acc.quantity} (type: ${typeof acc.quantity})`);
        
        if (!acc.assemblyId) {
          console.log(`      ❌ assemblyId is required`);
        }
        if (!acc.quantity || acc.quantity < 1) {
          console.log(`      ❌ quantity must be at least 1`);
        }
      });
    }
    
    console.log('\\n🎯 Test Summary:');
    console.log('✅ Order D14774586 has been thoroughly analyzed');
    console.log('💡 If validation is still failing, the issue might be:');
    console.log('  1. A type mismatch (string vs number)');
    console.log('  2. A null/undefined value where a string is expected');
    console.log('  3. An array validation issue');
    console.log('  4. The actual error is not from validation but from BOM generation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveValidationTest();