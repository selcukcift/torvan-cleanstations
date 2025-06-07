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
      const createdCategory = await prisma.category.create({
        data: {
          categoryId: catKey, // Use the key as CategoryID
          name: catData.name,
          description: catData.description,
        },
      });
      console.log(`Created category: ${createdCategory.name} (ID: ${createdCategory.categoryId})`);

      if (catData.subcategories && typeof catData.subcategories === 'object') {
        const subcategoriesToCreate = [];
        for (const subCatKey in catData.subcategories) {
          if (catData.subcategories.hasOwnProperty(subCatKey)) {
            const subCatData = catData.subcategories[subCatKey];
            subcategoriesToCreate.push({
              subcategoryId: subCatKey, // Use the key as SubcategoryID
              name: subCatData.name,
              description: subCatData.description,
              categoryId: createdCategory.categoryId, // Link to parent category
              // assemblies will be linked later if needed, or by assemblies linking to them
            });
          }
        }
        if (subcategoriesToCreate.length > 0) {
          await prisma.subcategory.createMany({
            data: subcategoriesToCreate,
          });
          console.log(`  Created ${subcategoriesToCreate.length} subcategories for ${createdCategory.name}`);
        }
      }
    }
  }

  // Seed Parts
  console.log('Seeding parts...');
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

  // Seed Assemblies and their Components
  console.log('Seeding assemblies and their components...');
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

  console.log('\n🎉 Comprehensive seeding process completed!');
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
