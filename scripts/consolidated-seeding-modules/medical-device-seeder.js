/**
 * Medical Device Seeder Module
 * 
 * Handles seeding of medical device components: parts, assemblies, and their relationships
 */

const fs = require('fs').promises;
const path = require('path');

class MedicalDeviceSeeder {
  constructor(prismaClient) {
    this.prisma = prismaClient;
    this.moduleName = 'MedicalDeviceSeeder';
  }

  async seed() {
    console.log('   🔧 Seeding medical device parts and assemblies...');
    
    const results = {
      parts: 0,
      assemblies: 0,
      components: 0,
      totalItems: 0
    };

    // Seed parts first (dependencies for assemblies)
    const partsResult = await this.seedParts();
    results.parts = partsResult.created;

    // Then seed assemblies and their components
    const assembliesResult = await this.seedAssemblies();
    results.assemblies = assembliesResult.assemblies;
    results.components = assembliesResult.components;

    results.totalItems = results.parts + results.assemblies + results.components;
    return results;
  }

  async seedParts() {
    const partsPath = path.join(__dirname, '../../resources/parts.json');
    const partsData = JSON.parse(await fs.readFile(partsPath, 'utf-8'));
    
    let partsCreated = 0;
    const batchSize = 100; // Process in batches for performance
    const partEntries = Object.entries(partsData.parts);

    console.log(`     📦 Processing ${partEntries.length} parts in batches...`);

    for (let i = 0; i < partEntries.length; i += batchSize) {
      const batch = partEntries.slice(i, i + batchSize);
      
      for (const [partId, partData] of batch) {
        const existing = await this.prisma.part.findUnique({
          where: { partId }
        });

        if (!existing) {
          await this.prisma.part.create({
            data: {
              partId,
              name: partData.name,
              manufacturerPartNumber: partData.manufacturer_part_number,
              type: this.mapPartType(partData.type),
              status: this.mapPartStatus(partData.status),
              manufacturerName: partData.manufacturer_info,
              requiresSerialTracking: partData.requiresSerial || false,
              isOutsourced: partData.isOutsourced || false
            }
          });
          partsCreated++;
        }
      }

      // Progress indicator
      if (i % 500 === 0) {
        console.log(`       📊 Processed ${Math.min(i + batchSize, partEntries.length)} / ${partEntries.length} parts`);
      }
    }

    return { created: partsCreated, total: partEntries.length };
  }

  async seedAssemblies() {
    const assembliesPath = path.join(__dirname, '../../resources/assemblies.json');
    const assembliesData = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    
    let assembliesCreated = 0;
    let componentsCreated = 0;
    const assemblyEntries = Object.entries(assembliesData.assemblies);

    console.log(`     🔨 Processing ${assemblyEntries.length} assemblies...`);

    // First pass: Create assemblies (without components to avoid circular dependencies)
    for (const [assemblyId, assemblyData] of assemblyEntries) {
      const existing = await this.prisma.assembly.findUnique({
        where: { assemblyId }
      });

      if (!existing) {
        await this.prisma.assembly.create({
          data: {
            assemblyId,
            name: assemblyData.name,
            type: this.mapAssemblyType(assemblyData.type),
            categoryCode: assemblyData.categoryCode,
            subcategoryCode: assemblyData.subcategoryCode,
            requiresSerialTracking: assemblyData.requiresSerial || false,
            isOutsourced: assemblyData.isOutsourced || false
          }
        });
        assembliesCreated++;
      }
    }

    // Second pass: Create assembly components
    console.log('     🔗 Creating assembly component relationships...');
    
    for (const [assemblyId, assemblyData] of assemblyEntries) {
      if (assemblyData.components && assemblyData.components.length > 0) {
        for (const component of assemblyData.components) {
          // Skip if component references don't exist
          if (component.partId) {
            const partExists = await this.prisma.part.findUnique({
              where: { partId: component.partId }
            });
            if (!partExists) continue;
          }

          if (component.assemblyId) {
            const assemblyExists = await this.prisma.assembly.findUnique({
              where: { assemblyId: component.assemblyId }
            });
            if (!assemblyExists) continue;
          }

          // Create component relationship
          const existingComponent = await this.prisma.assemblyComponent.findFirst({
            where: {
              parentAssemblyId: assemblyId,
              childPartId: component.partId || null,
              childAssemblyId: component.assemblyId || null
            }
          });

          if (!existingComponent) {
            await this.prisma.assemblyComponent.create({
              data: {
                parentAssemblyId: assemblyId,
                childPartId: component.partId || null,
                childAssemblyId: component.assemblyId || null,
                quantity: component.quantity || 1,
                notes: component.notes
              }
            });
            componentsCreated++;
          }
        }
      }
    }

    return { assemblies: assembliesCreated, components: componentsCreated };
  }

  mapPartType(type) {
    const typeMap = {
      'COMPONENT': 'COMPONENT',
      'MATERIAL': 'MATERIAL',
      'FASTENER': 'FASTENER',
      'ELECTRONIC': 'ELECTRONIC'
    };
    return typeMap[type] || 'COMPONENT';
  }

  mapPartStatus(status) {
    const statusMap = {
      'ACTIVE': 'ACTIVE',
      'INACTIVE': 'INACTIVE',
      'OBSOLETE': 'OBSOLETE'
    };
    return statusMap[status] || 'ACTIVE';
  }

  mapAssemblyType(type) {
    const typeMap = {
      'ASSEMBLY': 'SIMPLE',
      'KIT': 'KIT',
      'SUBASSEMBLY': 'COMPLEX',
      'SERVICE_PART': 'SERVICE_PART'
    };
    return typeMap[type] || 'SIMPLE';
  }
}

module.exports = MedicalDeviceSeeder;