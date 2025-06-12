const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestOrdersForQC() {
  console.log('🔄 Creating comprehensive test orders for QC integration testing...')

  try {
    // Clean up existing test data first
    console.log('🧹 Cleaning up existing test data...')
    await prisma.orderQcItemResult.deleteMany({
      where: {
        orderQcResult: {
          order: {
            poNumber: {
              startsWith: 'TEST-QC-'
            }
          }
        }
      }
    })
    await prisma.orderQcResult.deleteMany({
      where: {
        order: {
          poNumber: {
            startsWith: 'TEST-QC-'
          }
        }
      }
    })
    await prisma.orderHistoryLog.deleteMany({
      where: {
        order: {
          poNumber: {
            startsWith: 'TEST-QC-'
          }
        }
      }
    })
    await prisma.selectedAccessory.deleteMany({
      where: {
        order: {
          poNumber: {
            startsWith: 'TEST-QC-'
          }
        }
      }
    })
    await prisma.sprayerConfiguration.deleteMany({
      where: {
        order: {
          poNumber: {
            startsWith: 'TEST-QC-'
          }
        }
      }
    })
    await prisma.faucetConfiguration.deleteMany({
      where: {
        order: {
          poNumber: {
            startsWith: 'TEST-QC-'
          }
        }
      }
    })
    await prisma.sinkConfiguration.deleteMany({
      where: {
        order: {
          poNumber: {
            startsWith: 'TEST-QC-'
          }
        }
      }
    })
    await prisma.basinConfiguration.deleteMany({
      where: {
        order: {
          poNumber: {
            startsWith: 'TEST-QC-'
          }
        }
      }
    })
    await prisma.order.deleteMany({
      where: {
        poNumber: {
          startsWith: 'TEST-QC-'
        }
      }
    })
    console.log('✅ Cleaned up existing test data')
    // Ensure we have test users
    const qcUser = await prisma.user.upsert({
      where: { username: 'qc_inspector' },
      update: {},
      create: {
        username: 'qc_inspector',
        email: 'qc@torvan.test',
        passwordHash: '$2b$10$placeholder', // This would be properly hashed in production
        fullName: 'QC Inspector Test',
        role: 'QC_PERSON',
        initials: 'QIT',
        isActive: true
      }
    })

    const prodCoordinator = await prisma.user.upsert({
      where: { username: 'prod_coordinator' },
      update: {},
      create: {
        username: 'prod_coordinator',
        email: 'prod@torvan.test',
        passwordHash: '$2b$10$placeholder',
        fullName: 'Production Coordinator Test',
        role: 'PRODUCTION_COORDINATOR',
        initials: 'PCT',
        isActive: true
      }
    })

    console.log('✅ Created test users')

    // Test Order 1: Simple MDRD Sink with E-Drain Basin - Ready for Pre-QC
    const testOrder1 = await prisma.order.create({
      data: {
        poNumber: 'TEST-QC-001',
        buildNumbers: ['BUILD-001'],
        customerName: 'QC Test Hospital',
        projectName: 'QC Integration Testing - Simple E-Drain',
        salesPerson: 'Test Sales',
        wantDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: 'Test order for QC integration testing - Simple E-Drain configuration',
        language: 'EN',
        orderStatus: 'READY_FOR_PRE_QC',
        createdById: prodCoordinator.id,
        
        // Basin configuration - Single E-Drain basin
        basinConfigurations: {
          create: [{
            buildNumber: 'BUILD-001',
            basinTypeId: 'E-DRAIN-20X20X8',
            basinSizePartNumber: 'T2-BASIN-20X20X8',
            basinCount: 1,
            addonIds: ['P-TRAP', 'BASIN-LIGHT']
          }]
        },
        
        // Sink configuration with pegboard
        sinkConfigurations: {
          create: [{
            buildNumber: 'BUILD-001',
            sinkModelId: 'T2-B1',
            width: 48,
            length: 60,
            legsTypeId: 'T2-DL27-KIT',
            feetTypeId: 'T2-LEVELING-CASTOR-475',
            workflowDirection: 'Left to Right',
            pegboard: true,
            pegboardTypeId: 'PERF',
            pegboardColorId: 'GREEN'
          }]
        },
        
        // Faucet configuration
        faucetConfigurations: {
          create: [{
            buildNumber: 'BUILD-001',
            faucetTypeId: 'WRIST-BLADE-10IN',
            faucetQuantity: 1,
            faucetPlacement: 'Center'
          }]
        }
      }
    })

    console.log('✅ Created Test Order 1: Simple E-Drain (Ready for Pre-QC)')

    // Test Order 2: Complex MDRD Sink with Multiple E-Sink Basins - Ready for Production Check
    const testOrder2 = await prisma.order.create({
      data: {
        poNumber: 'TEST-QC-002',
        buildNumbers: ['BUILD-002'],
        customerName: 'Advanced Medical Center',
        projectName: 'QC Integration Testing - Complex E-Sink',
        salesPerson: 'Test Sales',
        wantDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        notes: 'Test order for QC integration testing - Complex E-Sink configuration with multiple basins',
        language: 'EN',
        orderStatus: 'READY_FOR_PRODUCTION',
        createdById: prodCoordinator.id,
        
        // Multiple basin configuration - 2 E-Sink basins
        basinConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-002',
              basinTypeId: 'E-SINK-24X20X10',
              basinSizePartNumber: 'T2-BASIN-24X20X10',
              basinCount: 1,
              addonIds: ['P-TRAP', 'BASIN-LIGHT', 'DOSING-PORT']
            },
            {
              buildNumber: 'BUILD-002',
              basinTypeId: 'E-SINK-30X20X10',
              basinSizePartNumber: 'T2-BASIN-30X20X10',
              basinCount: 1,
              addonIds: ['P-TRAP', 'BASIN-LIGHT', 'DOSING-PORT', 'TEMP-SENSOR']
            }
          ]
        },
        
        // Larger sink configuration
        sinkConfigurations: {
          create: [{
            buildNumber: 'BUILD-002',
            sinkModelId: 'T2-B2',
            width: 60,
            length: 84,
            legsTypeId: 'T2-DL14-FH-KIT',
            feetTypeId: 'T2-SEISMIC-FEET',
            workflowDirection: 'Right to Left',
            pegboard: true,
            pegboardTypeId: 'SOLID',
            pegboardColorId: 'BLUE',
            hasDrawersAndCompartments: true,
            drawersAndCompartments: ['DRAWER-LARGE', 'COMPARTMENT-SMALL'],
            controlBoxId: 'T2-CONTROL-BOX-ESINK'
          }]
        },
        
        // Multiple faucets
        faucetConfigurations: {
          create: [{
            buildNumber: 'BUILD-002',
            faucetTypeId: 'PRE-RINSE-OVERHEAD',
            faucetQuantity: 2,
            faucetPlacement: 'Between Basins'
          }]
        },
        
        // Sprayer configuration
        sprayerConfigurations: {
          create: [{
            buildNumber: 'BUILD-002',
            hasSpray: true,
            sprayerTypeIds: ['DI-WATER-GUN-TURRET', 'AIR-GUN-ROSETTE'],
            sprayerQuantity: 2,
            sprayerLocations: ['Left Side', 'Right Side']
          }]
        }
      }
    })

    console.log('✅ Created Test Order 2: Complex E-Sink (Ready for Production)')

    // Test Order 3: Mixed Basin Types - Ready for Final QC
    const testOrder3 = await prisma.order.create({
      data: {
        poNumber: 'TEST-QC-003',
        buildNumbers: ['BUILD-003A', 'BUILD-003B'],
        customerName: 'University Research Hospital',
        projectName: 'QC Integration Testing - Mixed Configuration',
        salesPerson: 'Test Sales',
        wantDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        notes: 'Test order for QC integration testing - Mixed E-Drain and E-Sink configuration',
        language: 'FR', // French language for manual testing
        orderStatus: 'READY_FOR_FINAL_QC',
        createdById: prodCoordinator.id,
        
        // Mixed basin configurations for testing conditional logic
        basinConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-003A',
              basinTypeId: 'E-DRAIN-24X20X8',
              basinSizePartNumber: 'T2-BASIN-24X20X8',
              basinCount: 1,
              addonIds: ['P-TRAP', 'BASIN-LIGHT']
            },
            {
              buildNumber: 'BUILD-003A',
              basinTypeId: 'E-SINK-30X20X10',
              basinSizePartNumber: 'T2-BASIN-30X20X10',
              basinCount: 1,
              addonIds: ['P-TRAP', 'DOSING-PORT', 'TEMP-SENSOR']
            },
            {
              buildNumber: 'BUILD-003B',
              basinTypeId: 'E-SINK-DI-24X20X8',
              basinSizePartNumber: 'T2-BASIN-DI-24X20X8',
              basinCount: 1,
              addonIds: ['P-TRAP', 'BASIN-LIGHT', 'DI-FAUCET']
            }
          ]
        },
        
        // Custom dimensions for testing
        sinkConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-003A',
              sinkModelId: 'T2-B2',
              width: 54,
              length: 72,
              legsTypeId: 'T2-LC1-KIT',
              feetTypeId: 'T2-LEVELING-CASTOR-475',
              workflowDirection: 'Left to Right',
              pegboard: false, // No pegboard for N/A testing
              controlBoxId: 'T2-CONTROL-BOX-MIXED'
            },
            {
              buildNumber: 'BUILD-003B',
              sinkModelId: 'T2-B1',
              width: 48,
              length: 60,
              legsTypeId: 'T2-DL27-KIT',
              feetTypeId: 'T2-SEISMIC-FEET',
              workflowDirection: 'Right to Left',
              pegboard: true,
              pegboardTypeId: 'PERF',
              pegboardColorId: 'YELLOW'
            }
          ]
        },
        
        // Accessories for packaging verification testing
        selectedAccessories: {
          create: [
            {
              buildNumber: 'BUILD-003A',
              assemblyId: 'T2-AIR-GUN-KIT',
              quantity: 1
            },
            {
              buildNumber: 'BUILD-003A',
              assemblyId: 'T2-WATER-GUN-KIT',
              quantity: 1
            },
            {
              buildNumber: 'BUILD-003B',
              assemblyId: 'T2-PRE-RINSE-FAUCET-KIT',
              quantity: 1
            }
          ]
        }
      }
    })

    console.log('✅ Created Test Order 3: Mixed Configuration (Ready for Final QC)')

    // Test Order 4: Custom Basin Sizes - Testing Complete
    const testOrder4 = await prisma.order.create({
      data: {
        poNumber: 'TEST-QC-004',
        buildNumbers: ['BUILD-004'],
        customerName: 'Custom Solutions Medical',
        projectName: 'QC Integration Testing - Custom Basins',
        salesPerson: 'Test Sales',
        wantDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        notes: 'Test order for QC integration testing - Custom basin dimensions',
        language: 'EN',
        orderStatus: 'TESTING_COMPLETE',
        createdById: prodCoordinator.id,
        
        // Custom basin configurations
        basinConfigurations: {
          create: [
            {
              buildNumber: 'BUILD-004',
              basinTypeId: 'E-SINK-CUSTOM',
              basinSizePartNumber: 'T2-BASIN-CUSTOM-28X18X12',
              basinCount: 1,
              addonIds: ['P-TRAP', 'BASIN-LIGHT', 'DOSING-PORT'],
              customLength: 28,
              customWidth: 18,
              customDepth: 12
            }
          ]
        },
        
        sinkConfigurations: {
          create: [{
            buildNumber: 'BUILD-004',
            sinkModelId: 'T2-B1',
            width: 48,
            length: 66,
            legsTypeId: 'T2-DL14-KIT',
            feetTypeId: 'T2-LEVELING-CASTOR-475',
            workflowDirection: 'Left to Right',
            pegboard: true,
            pegboardTypeId: 'SOLID',
            pegboardColorId: 'RED',
            hasDrawersAndCompartments: true,
            drawersAndCompartments: ['DRAWER-MEDIUM', 'COMPARTMENT-LARGE']
          }]
        }
      }
    })

    console.log('✅ Created Test Order 4: Custom Basins (Testing Complete)')

    // Create some sample QC results for testing history
    const preQcTemplate = await prisma.qcFormTemplate.findFirst({
      where: { name: 'Pre-Production Check' }
    })

    if (preQcTemplate) {
      await prisma.orderQcResult.create({
        data: {
          orderId: testOrder4.id,
          qcFormTemplateId: preQcTemplate.id,
          qcPerformedById: qcUser.id,
          overallStatus: 'PASSED',
          notes: 'Pre-QC completed successfully. All dimensions verified.',
          itemResults: {
            create: [
              {
                qcFormTemplateItemId: preQcTemplate.items?.[0]?.id || 'placeholder',
                resultValue: 'TEST-JOB-004',
                isConformant: true,
                notes: 'Job ID recorded'
              }
            ]
          }
        }
      })
      console.log('✅ Created sample QC result for historical data')
    }

    // Create order history logs for testing
    await prisma.orderHistoryLog.createMany({
      data: [
        {
          orderId: testOrder1.id,
          userId: prodCoordinator.id,
          action: 'ORDER_CREATED',
          newStatus: 'ORDER_CREATED',
          notes: 'Initial order creation'
        },
        {
          orderId: testOrder1.id,
          userId: prodCoordinator.id,
          action: 'PARTS_ARRIVAL_CONFIRMED',
          oldStatus: 'PARTS_SENT_WAITING_ARRIVAL',
          newStatus: 'READY_FOR_PRE_QC',
          notes: 'Parts arrived, ready for Pre-QC inspection'
        },
        {
          orderId: testOrder2.id,
          userId: qcUser.id,
          action: 'PRE_QC_COMPLETED',
          oldStatus: 'READY_FOR_PRE_QC',
          newStatus: 'READY_FOR_PRODUCTION',
          notes: 'Pre-QC inspection passed'
        },
        {
          orderId: testOrder3.id,
          userId: prodCoordinator.id,
          action: 'PRODUCTION_COMPLETED',
          oldStatus: 'READY_FOR_PRODUCTION',
          newStatus: 'READY_FOR_FINAL_QC',
          notes: 'Production and assembly completed, ready for final QC'
        }
      ]
    })

    console.log('✅ Created order history logs')

    // Display summary
    console.log('\n🎉 Successfully created comprehensive test orders for QC integration testing!')
    console.log('\n📊 Test Order Summary:')
    console.log(`   • ${testOrder1.poNumber}: Simple E-Drain (Ready for Pre-QC)`)
    console.log(`   • ${testOrder2.poNumber}: Complex E-Sink (Ready for Production Check)`)
    console.log(`   • ${testOrder3.poNumber}: Mixed Configuration (Ready for Final QC)`)
    console.log(`   • ${testOrder4.poNumber}: Custom Basins (Testing Complete - with QC history)`)
    
    console.log('\n👥 Test Users Created:')
    console.log(`   • QC Inspector: ${qcUser.username} (${qcUser.email})`)
    console.log(`   • Production Coordinator: ${prodCoordinator.username} (${prodCoordinator.email})`)
    
    console.log('\n🧪 Test Scenarios Covered:')
    console.log('   • Pre-Production Check workflow')
    console.log('   • Production Check with complex configurations')
    console.log('   • Final QC with mixed basin types')
    console.log('   • Custom basin dimensions')
    console.log('   • Pegboard vs No pegboard scenarios')
    console.log('   • E-Drain vs E-Sink vs E-Sink DI basin types')
    console.log('   • Multiple build numbers')
    console.log('   • French language configuration')
    console.log('   • Accessories and optional components')
    console.log('   • Historical QC data')

    return {
      testOrders: [testOrder1, testOrder2, testOrder3, testOrder4],
      testUsers: [qcUser, prodCoordinator]
    }

  } catch (error) {
    console.error('❌ Error creating test orders:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  createTestOrdersForQC()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { createTestOrdersForQC }