const { prisma } = require('../src/config');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process'); // Added for running shell commands
const bcrypt = require('bcryptjs');

async function resetDatabase() {
  console.log('Attempting to reset database...');
  try {
    // Using execSync to run the Prisma command. Ensure Prisma CLI is globally available or use npx.
    // For pwsh.exe, npx should work fine.
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    console.log('Database reset successfully.');
  } catch (error) {
    console.error('Failed to reset database:', error);
    // Decide if seeding should continue or exit
    // For now, we'll throw to stop the process if reset fails critically
    throw new Error('Database reset failed, aborting seed.'); 
  }
}

async function main() {
  console.log('🚀 Starting comprehensive seeding process...');
  console.log('This will seed: Core Data → QC Templates → Enhanced Features');

  // Option to reset database - uncomment the line below to enable automatic reset.
  // WARNING: This will WIPE your database. Use with caution.
  // await resetDatabase(); 

  console.warn('IMPORTANT: If not using automatic reset, ensure the database is clean before seeding (e.g., by running "npx prisma migrate reset --force" manually).');

  // Load data
  const partsDataJson = JSON.parse(await fs.readFile(path.join(__dirname, '../resources/parts.json'), 'utf-8'));
  const assembliesDataJson = JSON.parse(await fs.readFile(path.join(__dirname, '../resources/assemblies.json'), 'utf-8'));
  const categoriesDataJson = JSON.parse(await fs.readFile(path.join(__dirname, '../resources/categories.json'), 'utf-8'));

  // Extract the actual arrays/objects from the loaded JSON
  const partsCollection = partsDataJson.parts; // parts is an object keyed by PartID
  const assembliesCollection = assembliesDataJson.assemblies; // assemblies is an object keyed by AssemblyID
  const categoriesData = categoriesDataJson.categories;

  // Seed Categories and Subcategories
  console.log('Seeding categories and subcategories...');
  // The categoriesData is an object, not an array. We need to iterate over its values.
  for (const catKey in categoriesData) {
    if (categoriesData.hasOwnProperty(catKey)) {
      const catData = categoriesData[catKey];
      const createdCategory = await prisma.category.upsert({
        where: {
          categoryId: catKey, // Use the key as CategoryID
        },
        update: {
          name: catData.name,
          description: catData.description,
        },
        create: {
          categoryId: catKey, // Use the key as CategoryID
          name: catData.name,
          description: catData.description,
        },
      });
      console.log(`Created category: ${createdCategory.name} (ID: ${createdCategory.categoryId})`);

      if (catData.subcategories && typeof catData.subcategories === 'object') {
        let subcategoriesUpserted = 0;
        for (const subCatKey in catData.subcategories) {
          if (catData.subcategories.hasOwnProperty(subCatKey)) {
            const subCatData = catData.subcategories[subCatKey];
            await prisma.subcategory.upsert({
              where: {
                subcategoryId: subCatKey,
              },
              update: {
                name: subCatData.name,
                description: subCatData.description,
                categoryId: createdCategory.categoryId,
              },
              create: {
                subcategoryId: subCatKey, // Use the key as SubcategoryID
                name: subCatData.name,
                description: subCatData.description,
                categoryId: createdCategory.categoryId, // Link to parent category
              },
            });
            subcategoriesUpserted++;
          }
        }
        if (subcategoriesUpserted > 0) {
          console.log(`  Created ${subcategoriesUpserted} subcategories for ${createdCategory.name}`);
        }
      }
    }
  }

  // Seed Parts
  console.log('Seeding parts...');
  const existingPartsCount = await prisma.part.count();
  if (existingPartsCount > 0) {
    console.log(`Skipping parts seeding - ${existingPartsCount} parts already exist.`);
  } else {
    const partsToCreate = [];
  for (const partKey in partsCollection) {
    if (partsCollection.hasOwnProperty(partKey)) {
      const part = partsCollection[partKey];
      partsToCreate.push({
        partId: partKey, // Use the key as PartID
        name: part.name, // Corrected to lowercase 'name' based on typical JSON conventions
        manufacturerPartNumber: part.manufacturer_part_number, // Corrected to snake_case
        type: part.type, // Corrected to lowercase 'type'
        status: part.status, // Corrected to lowercase 'status'
        photoURL: part.photoURL, // Assuming this casing is correct or needs adjustment
        technicalDrawingURL: part.technicalDrawingURL, // Assuming this casing is correct
      });
    }
  }

    if (partsToCreate.length > 0) {
      await prisma.part.createMany({
        data: partsToCreate,
      });
      console.log(`Seeded ${partsToCreate.length} parts.`);
    }
  }

  // Seed Assemblies and their Components
  console.log('Seeding assemblies and their components...');
  const existingAssembliesCount = await prisma.assembly.count();
  if (existingAssembliesCount > 0) {
    console.log(`Skipping assemblies seeding - ${existingAssembliesCount} assemblies already exist.`);
  } else {
    for (const asmKey in assembliesCollection) {
    if (assembliesCollection.hasOwnProperty(asmKey)) {
      const asmData = assembliesCollection[asmKey];
      const assemblyPayload = {
        assemblyId: asmKey, // Use the key as AssemblyID
        name: asmData.name, // Corrected to lowercase 'name'
        type: asmData.type, // Corrected to lowercase 'type'
        categoryCode: asmData.category_code, // Corrected to snake_case
        subcategoryCode: asmData.subcategory_code, // Corrected to snake_case
        workInstructionId: asmData.work_instruction_id, // Corrected to snake_case
        qrData: asmData.qr_data, // Corrected to snake_case
        kitComponentsJson: (asmData.is_kit && asmData.kit_components) ? JSON.stringify(asmData.kit_components) : null, // Corrected to snake_case
      };

      // Handling the M-N relation to Subcategory
      if (asmData.subcategory_code) { // Corrected to snake_case
        const subcategoryExists = await prisma.subcategory.findUnique({
          where: { subcategoryId: asmData.subcategory_code }, // Corrected to snake_case
        });
        if (subcategoryExists) {
          assemblyPayload.subcategories = {
            connect: [{ subcategoryId: asmData.subcategory_code }], // Corrected to snake_case
          };
        } else {
          console.warn(`Subcategory with code ${asmData.subcategory_code} for assembly ${asmKey} not found. Skipping linkage.`); // Corrected to snake_case
        }
      }

      const createdAssembly = await prisma.assembly.create({
        data: assemblyPayload,
      });
      console.log(`Created assembly: ${createdAssembly.name} (ID: ${createdAssembly.assemblyId})`);

      if (asmData.components && asmData.components.length > 0) { // Corrected to lowercase 'components'
        const componentsToCreate = asmData.components.map(comp => { // Corrected to lowercase 'components'
          const componentData = {
            parentAssemblyId: createdAssembly.assemblyId,
            quantity: comp.quantity, // Corrected to lowercase 'quantity'
            notes: comp.notes, // Corrected to lowercase 'notes'
          };
          if (comp.part_id) { // Corrected to snake_case
            componentData.childPartId = comp.part_id; // Corrected to snake_case
          } else if (comp.assembly_id) { // Corrected to snake_case
            componentData.childAssemblyId = comp.assembly_id; // Corrected to snake_case
          }
          return componentData;
        }).filter(c => c.childPartId || c.childAssemblyId); // Ensure component links to a child

        if (componentsToCreate.length > 0) {
          await prisma.assemblyComponent.createMany({
            data: componentsToCreate,
          });
          console.log(`  Added ${componentsToCreate.length} components to ${createdAssembly.name}`);
        }
      }
    }
  }
  }

  // Seed Users (one per major role)
  console.log('Seeding users...');
  const usersToSeed = [
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'System Admin',
      role: 'ADMIN',
      initials: 'SA',
      email: 'admin@torvan.local',
    },
    {
      username: 'coordinator',
      password: 'coordinator123',
      fullName: 'Production Coordinator',
      role: 'PRODUCTION_COORDINATOR',
      initials: 'PC',
      email: 'coordinator@torvan.local',
    },
    {
      username: 'procurement',
      password: 'procure123',
      fullName: 'Procurement Specialist',
      role: 'PROCUREMENT_SPECIALIST',
      initials: 'PS',
      email: 'procurement@torvan.local',
    },
    {
      username: 'qc',
      password: 'qc123',
      fullName: 'Quality Control',
      role: 'QC_PERSON',
      initials: 'QC',
      email: 'qc@torvan.local',
    },
    {
      username: 'assembler',
      password: 'assemble123',
      fullName: 'Assembler',
      role: 'ASSEMBLER',
      initials: 'AS',
      email: 'assembler@torvan.local',
    },
    {
      username: 'assembler1',
      password: 'assembler123',
      fullName: 'Production Assembler 1',
      role: 'ASSEMBLER',
      initials: 'PA1',
      email: 'assembler1@torvan.local',
    },
    {
      username: 'assembler2',
      password: 'assembler123',
      fullName: 'Production Assembler 2',
      role: 'ASSEMBLER',
      initials: 'PA2',
      email: 'assembler2@torvan.local',
    },
    {
      username: 'service',
      password: 'service123',
      fullName: 'Service Department',
      role: 'SERVICE_DEPARTMENT',
      initials: 'SD',
      email: 'service@torvan.local',
    },
  ];

  for (const user of usersToSeed) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
        initials: user.initials,
        email: user.email,
      },
    });
    console.log(`Seeded user: ${user.username} (${user.role})`);
  }

  console.log('✅ Core seeding finished successfully.');
  
  // Now run additional seeding modules
  console.log('\n📋 Seeding QC Templates...');
  try {
    const { seedQcTemplates } = require('./seedQcTemplates.js');
    await seedQcTemplates();
    console.log('✅ QC Templates seeded successfully.');
  } catch (error) {
    console.error('❌ QC Templates seeding failed:', error.message);
    // Continue with other seeding even if this fails
  }

  console.log('\n🔧 Seeding Enhanced Models...');
  try {
    const { seedEnhancedModels } = require('./seed-enhanced-models.js');
    await seedEnhancedModels();
    console.log('✅ Enhanced Models seeded successfully.');
  } catch (error) {
    console.error('❌ Enhanced Models seeding failed:', error.message);
    // Continue with verification even if this fails
  }

  console.log('\n🔧 Creating Size-Only Pegboard Kits...');
  try {
    const { createPegboardSizeKits } = require('./create-pegboard-size-kits.js');
    await createPegboardSizeKits();
    console.log('✅ Size-only pegboard kits created successfully.');
  } catch (error) {
    console.error('❌ Size-only pegboard kits creation failed:', error.message);
    // Continue with verification even if this fails
  }

  console.log('\n🔍 Verifying Pegboard Kits...');
  try {
    // Run verification inline since it's a simple check
    const pegboardKits = await prisma.assembly.findMany({
      where: {
        assemblyId: {
          startsWith: 'T2-ADW-PB-'
        }
      }
    });
    
    // Updated expectation: 128 colored + 16 size-only + 2 generic = 146+
    if (pegboardKits.length >= 146) {
      console.log(`✅ Pegboard verification passed: ${pegboardKits.length} pegboard kits found (including 16 size-only kits)`);
    } else {
      console.log(`⚠️  Pegboard verification: Only ${pegboardKits.length} pegboard kits found (expected 146+: 128 colored + 16 size-only + 2 generic)`);
    }
  } catch (error) {
    console.error('❌ Pegboard verification failed:', error.message);
  }

  console.log('\n📋 Seeding Task Templates for Assembly Workflows...');
  try {
    await seedTaskTemplates();
    console.log('✅ Task Templates seeded successfully.');
  } catch (error) {
    console.error('❌ Task Templates seeding failed:', error.message);
  }

  console.log('\n🧪 Seeding Testing Framework...');
  try {
    await seedTestingFramework();
    console.log('✅ Testing Framework seeded successfully.');
  } catch (error) {
    console.error('❌ Testing Framework seeding failed:', error.message);
  }

  console.log('\n📊 Seeding Sample Workflow Data...');
  try {
    await seedSampleWorkflowData();
    console.log('✅ Sample Workflow Data seeded successfully.');
  } catch (error) {
    console.error('❌ Sample Workflow Data seeding failed:', error.message);
  }

  console.log('\n🎉 Comprehensive seeding process completed!');
}

// Task Templates Seeding Function
async function seedTaskTemplates() {
  const existingTaskTemplates = await prisma.taskTemplate.count();
  if (existingTaskTemplates > 0) {
    console.log(`Skipping task templates - ${existingTaskTemplates} already exist.`);
    return;
  }

  const taskTemplates = [
    {
      name: "T2 Sink Complete Assembly",
      description: "Complete assembly workflow for T2 MDRD sinks",
      appliesToAssemblyType: "COMPLEX",
      appliesToProductFamily: "MDRD",
      steps: [
        {
          stepNumber: 1,
          title: "Pre-Assembly Preparation",
          description: "Unpack and inspect all components, verify against BOM",
          estimatedMinutes: 15
        },
        {
          stepNumber: 2, 
          title: "Sink Body Assembly",
          description: "Assemble main sink structure and mounting points",
          estimatedMinutes: 45
        },
        {
          stepNumber: 3,
          title: "Basin Installation",
          description: "Install and secure all basin components",
          estimatedMinutes: 30
        },
        {
          stepNumber: 4,
          title: "Plumbing Connections", 
          description: "Connect all water lines, drains, and fittings",
          estimatedMinutes: 60
        },
        {
          stepNumber: 5,
          title: "Electrical Installation",
          description: "Install control boxes, sensors, and wiring",
          estimatedMinutes: 45
        },
        {
          stepNumber: 6,
          title: "Pegboard Installation",
          description: "Mount pegboard and accessories if specified",
          estimatedMinutes: 20
        },
        {
          stepNumber: 7,
          title: "Final Assembly Check",
          description: "Verify all connections and prepare for testing",
          estimatedMinutes: 15
        }
      ]
    },
    {
      name: "Basin-Specific Assembly",
      description: "Assembly workflow specific to basin types (E-Sink, E-Drain)",
      appliesToAssemblyType: "SIMPLE",
      appliesToProductFamily: "MDRD",
      steps: [
        {
          stepNumber: 1,
          title: "Basin Preparation",
          description: "Prepare basin for installation and check dimensions",
          estimatedMinutes: 10
        },
        {
          stepNumber: 2,
          title: "Drain Assembly",
          description: "Install drain components and gaskets",
          estimatedMinutes: 20
        },
        {
          stepNumber: 3,
          title: "Special Features Installation",
          description: "Install basin lights, sensors, or other add-ons",
          estimatedMinutes: 25
        }
      ]
    },
    {
      name: "Control System Setup",
      description: "Electrical and control system configuration",
      appliesToAssemblyType: "COMPLEX",
      appliesToProductFamily: "MDRD",
      steps: [
        {
          stepNumber: 1,
          title: "Control Box Mounting",
          description: "Mount and secure control boxes",
          estimatedMinutes: 15
        },
        {
          stepNumber: 2,
          title: "Sensor Installation", 
          description: "Install and calibrate sensors",
          estimatedMinutes: 30
        },
        {
          stepNumber: 3,
          title: "Wiring and Connections",
          description: "Complete all electrical connections",
          estimatedMinutes: 45
        },
        {
          stepNumber: 4,
          title: "System Configuration",
          description: "Configure and test control system",
          estimatedMinutes: 30
        }
      ]
    }
  ];

  for (const template of taskTemplates) {
    const createdTemplate = await prisma.taskTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        appliesToAssemblyType: template.appliesToAssemblyType,
        appliesToProductFamily: template.appliesToProductFamily,
        version: "1.0",
        isActive: true
      }
    });

    for (const step of template.steps) {
      await prisma.taskTemplateStep.create({
        data: {
          taskTemplateId: createdTemplate.id,
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          estimatedMinutes: step.estimatedMinutes
        }
      });
    }
    console.log(`  Created task template: ${template.name} with ${template.steps.length} steps`);
  }
}

// Testing Framework Seeding Function
async function seedTestingFramework() {
  const existingTestProcedures = await prisma.testProcedureTemplate.count();
  if (existingTestProcedures > 0) {
    console.log(`Skipping test procedures - ${existingTestProcedures} already exist.`);
    return;
  }

  const testProcedures = [
    {
      name: "T2 Sink Functional Testing",
      description: "Complete functional testing protocol for T2 sinks",
      productFamily: "MDRD",
      estimatedDurationMinutes: 60,
      steps: [
        {
          stepNumber: 1,
          title: "Visual Inspection",
          instruction: "Perform complete visual inspection of assembly",
          expectedOutcome: "All components properly installed and aligned",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 2,
          title: "Water Flow Test",
          instruction: "Test all water connections and flow rates",
          expectedOutcome: "Proper flow rate and no leaks",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 3,
          title: "Electrical System Test",
          instruction: "Test all electrical components and controls",
          expectedOutcome: "All electrical systems functioning correctly",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 4,
          title: "Pressure Test",
          instruction: "Perform pressure test on all connections",
          expectedOutcome: "System holds pressure without leaks",
          inputDataType: "NUMERIC",
          numericUnit: "PSI",
          numericLowerLimit: 15.0,
          numericUpperLimit: 25.0
        },
        {
          stepNumber: 5,
          title: "Control System Verification",
          instruction: "Verify all control systems respond correctly",
          expectedOutcome: "All controls function as designed",
          inputDataType: "PASS_FAIL"
        }
      ]
    },
    {
      name: "Basin-Specific Testing",
      description: "Testing protocol for individual basin types",
      productFamily: "MDRD",
      estimatedDurationMinutes: 30,
      steps: [
        {
          stepNumber: 1,
          title: "Basin Drain Test",
          instruction: "Test basin drain function and seal",
          expectedOutcome: "Drain operates correctly with proper seal",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 2,
          title: "Basin Light Test",
          instruction: "Test basin lighting if equipped",
          expectedOutcome: "Lights illuminate properly",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 3,
          title: "Sensor Calibration",
          instruction: "Calibrate and test basin sensors",
          expectedOutcome: "Sensors respond within specifications",
          inputDataType: "NUMERIC",
          numericUnit: "seconds",
          numericLowerLimit: 0.5,
          numericUpperLimit: 2.0
        }
      ]
    },
    {
      name: "End-of-Line Testing",
      description: "Final comprehensive testing before shipping",
      productFamily: "MDRD",
      estimatedDurationMinutes: 90,
      steps: [
        {
          stepNumber: 1,
          title: "Complete System Test",
          instruction: "Run complete system through full operational cycle",
          expectedOutcome: "System completes full cycle without errors",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 2,
          title: "Safety Systems Test",
          instruction: "Test all safety interlocks and emergency stops",
          expectedOutcome: "All safety systems function correctly",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 3,
          title: "Performance Validation",
          instruction: "Validate system meets performance specifications",
          expectedOutcome: "System meets all performance criteria",
          inputDataType: "PASS_FAIL"
        },
        {
          stepNumber: 4,
          title: "Documentation Review",
          instruction: "Verify all documentation is complete and accurate",
          expectedOutcome: "All required documentation present",
          inputDataType: "PASS_FAIL"
        }
      ]
    }
  ];

  for (const procedure of testProcedures) {
    const createdProcedure = await prisma.testProcedureTemplate.create({
      data: {
        name: procedure.name,
        description: procedure.description,
        productFamily: procedure.productFamily,
        estimatedDurationMinutes: procedure.estimatedDurationMinutes,
        version: "1.0",
        isActive: true
      }
    });

    for (const step of procedure.steps) {
      await prisma.testProcedureStepTemplate.create({
        data: {
          testProcedureTemplateId: createdProcedure.id,
          stepNumber: step.stepNumber,
          title: step.title,
          instruction: step.instruction,
          expectedOutcome: step.expectedOutcome,
          inputDataType: step.inputDataType,
          numericUnit: step.numericUnit || null,
          numericLowerLimit: step.numericLowerLimit || null,
          numericUpperLimit: step.numericUpperLimit || null,
          isRequired: true
        }
      });
    }
    console.log(`  Created test procedure: ${procedure.name} with ${procedure.steps.length} steps`);
  }
}

// Sample Workflow Data Seeding Function
async function seedSampleWorkflowData() {
  // Get existing orders and users
  const existingOrder = await prisma.order.findFirst();
  const procurementUser = await prisma.user.findFirst({ where: { role: 'PROCUREMENT_SPECIALIST' } });
  const qcUser = await prisma.user.findFirst({ where: { role: 'QC_PERSON' } });
  const assemblerUser = await prisma.user.findFirst({ where: { role: 'ASSEMBLER' } });

  if (!existingOrder || !procurementUser || !qcUser || !assemblerUser) {
    console.log('Required users or orders not found for sample workflow data');
    return;
  }

  // Create sample BOM if none exists
  const existingBOM = await prisma.bom.findFirst();
  if (!existingBOM) {
    const sampleBOM = await prisma.bom.create({
      data: {
        orderId: existingOrder.id,
        buildNumber: existingOrder.buildNumbers[0] || "001",
        bomItems: {
          create: [
            {
              partIdOrAssemblyId: "T2-BODY-48-60-HA",
              name: "T2 Sink Body 48-60 Height Adjustable",
              quantity: 1,
              itemType: "ASSEMBLY",
              category: "SINK BODY"
            },
            {
              partIdOrAssemblyId: "T2-BASIN-20X20X8",
              name: "Basin 20x20x8",
              quantity: 2,
              itemType: "ASSEMBLY", 
              category: "BASIN"
            },
            {
              partIdOrAssemblyId: "T2-CB-2BASIN-ESINK",
              name: "Control Box 2-Basin E-Sink",
              quantity: 1,
              itemType: "ASSEMBLY",
              category: "CONTROL BOX"
            }
          ]
        }
      }
    });
    console.log('  Created sample BOM with 3 items');
  }

  // Create sample service order if none exists
  const existingServiceOrder = await prisma.serviceOrder.count();
  if (existingServiceOrder === 0) {
    const serviceUser = await prisma.user.findFirst({ where: { role: 'SERVICE_DEPARTMENT' } });
    if (serviceUser) {
      const serviceParts = await prisma.part.findMany({ take: 3 });
      
      await prisma.serviceOrder.create({
        data: {
          requestedById: serviceUser.id,
          status: 'PENDING_APPROVAL',
          notes: 'Replacement parts needed for maintenance',
          items: {
            create: serviceParts.map(part => ({
              partId: part.partId,
              quantityRequested: Math.floor(Math.random() * 5) + 1,
              notes: `Replacement ${part.name}`
            }))
          }
        }
      });
      console.log('  Created sample service order with parts request');
    }
  }

  // Create sample QC result if none exists
  const existingQCResult = await prisma.orderQcResult.count();
  if (existingQCResult === 0) {
    const qcTemplate = await prisma.qcFormTemplate.findFirst();
    if (qcTemplate) {
      await prisma.orderQcResult.create({
        data: {
          orderId: existingOrder.id,
          qcFormTemplateId: qcTemplate.id,
          qcPerformedById: qcUser.id,
          overallStatus: 'PASSED',
          notes: 'Sample QC inspection completed successfully',
          externalJobId: 'JOB-' + Date.now()
        }
      });
      console.log('  Created sample QC result');
    }
  }

  // Create sample inventory transactions if none exist
  const existingTransactions = await prisma.inventoryTransaction.count();
  if (existingTransactions === 0) {
    const inventoryItems = await prisma.inventoryItem.findMany({ take: 3 });
    
    for (const item of inventoryItems) {
      await prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: item.id,
          type: 'OUTGOING',
          quantity: -1,
          reason: 'Used in production',
          orderId: existingOrder.id,
          performedById: assemblerUser.id
        }
      });
    }
    console.log(`  Created ${inventoryItems.length} sample inventory transactions`);
  }

  // Create sample notifications if none exist
  const existingNotifications = await prisma.notification.count();
  if (existingNotifications === 0) {
    await prisma.notification.create({
      data: {
        message: `Order ${existingOrder.poNumber} is ready for procurement review`,
        linkToOrder: existingOrder.id,
        recipientId: procurementUser.id,
        type: 'ORDER_STATUS_CHANGE'
      }
    });
    
    await prisma.notification.create({
      data: {
        message: `QC inspection completed for order ${existingOrder.poNumber}`,
        linkToOrder: existingOrder.id,
        recipientId: procurementUser.id,
        type: 'QC_APPROVAL_REQUIRED'
      }
    });
    console.log('  Created sample notifications');
  }

  console.log('Sample workflow data seeding completed');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    console.log('Prisma client disconnected after error.');
    process.exit(1);
  });
