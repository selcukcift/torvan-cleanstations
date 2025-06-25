const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

/**
 * Transaction-Based Seeding Manager with Rollback Capability
 * 
 * Provides safe, atomic seeding operations with comprehensive rollback support
 * for the CleanStation medical device manufacturing system.
 */

class TransactionSeedingManager {
  constructor() {
    this.prisma = new PrismaClient();
    this.seedingLog = [];
    this.rollbackStack = [];
    this.currentTransaction = null;
  }

  async startTransaction() {
    console.log('🔄 Starting transaction-based seeding...');
    this.currentTransaction = await this.prisma.$transaction(async (tx) => {
      this.prisma = tx; // Use transaction client
      return this.executeSeeding();
    }, {
      maxWait: 300000, // 5 minutes
      timeout: 600000, // 10 minutes
    });
    return this.currentTransaction;
  }

  async executeSeeding() {
    try {
      console.log('📦 Executing seeding modules in order...');
      
      // Core data seeding order (dependency-based)
      const seedingModules = [
        this.seedUsers.bind(this),
        this.seedCategories.bind(this),
        this.seedParts.bind(this),
        this.seedAssemblies.bind(this),
        this.seedQcTemplates.bind(this),
        this.seedTaskTemplates.bind(this),
        this.seedNotificationPreferences.bind(this)
      ];

      for (const seedModule of seedingModules) {
        const moduleName = seedModule.name;
        console.log(`   🌱 Seeding ${moduleName}...`);
        
        try {
          const result = await seedModule();
          this.logSuccess(moduleName, result);
        } catch (error) {
          this.logError(moduleName, error);
          throw new Error(`Seeding failed at module: ${moduleName} - ${error.message}`);
        }
      }

      console.log('✅ All seeding modules completed successfully');
      return { success: true, log: this.seedingLog };

    } catch (error) {
      console.error('❌ Seeding failed, transaction will rollback automatically');
      throw error;
    }
  }

  async seedUsers() {
    const users = [
      {
        username: 'admin',
        email: 'admin@torvanmedical.com',
        passwordHash: 'hashed_password_here', // In production, use proper hashing
        fullName: 'System Administrator',
        role: 'ADMIN',
        initials: 'SA',
        isActive: true
      },
      {
        username: 'qc_inspector',
        email: 'qc@torvanmedical.com',
        passwordHash: 'hashed_password_here',
        fullName: 'QC Inspector',
        role: 'QC_PERSON',
        initials: 'QC',
        isActive: true
      },
      {
        username: 'production_coord',
        email: 'production@torvanmedical.com',
        passwordHash: 'hashed_password_here',
        fullName: 'Production Coordinator',
        role: 'PRODUCTION_COORDINATOR',
        initials: 'PC',
        isActive: true
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const existing = await this.prisma.user.findUnique({
        where: { username: userData.username }
      });

      if (!existing) {
        const user = await this.prisma.user.create({ data: userData });
        createdUsers.push(user);
      }
    }

    return { created: createdUsers.length, total: users.length };
  }

  async seedCategories() {
    const categoriesPath = path.join(__dirname, '../resources/categories.json');
    const categoriesData = JSON.parse(await fs.readFile(categoriesPath, 'utf-8'));
    
    let categoriesCreated = 0;
    let subcategoriesCreated = 0;

    for (const [categoryId, categoryData] of Object.entries(categoriesData.categories)) {
      // Create category
      const existing = await this.prisma.category.findUnique({
        where: { categoryId }
      });

      if (!existing) {
        await this.prisma.category.create({
          data: {
            categoryId,
            name: categoryData.name,
            description: categoryData.description
          }
        });
        categoriesCreated++;
      }

      // Create subcategories
      for (const [subId, subData] of Object.entries(categoryData.subcategories || {})) {
        const existingSub = await this.prisma.subcategory.findUnique({
          where: { subcategoryId: subId }
        });

        if (!existingSub) {
          await this.prisma.subcategory.create({
            data: {
              subcategoryId: subId,
              name: subData.name,
              description: subData.description,
              categoryId
            }
          });
          subcategoriesCreated++;
        }
      }
    }

    return { categoriesCreated, subcategoriesCreated };
  }

  async seedParts() {
    const partsPath = path.join(__dirname, '../resources/parts.json');
    const partsData = JSON.parse(await fs.readFile(partsPath, 'utf-8'));
    
    let partsCreated = 0;
    const batchSize = 50; // Process in batches to avoid memory issues
    const partEntries = Object.entries(partsData.parts);

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
              type: partData.type || 'COMPONENT',
              status: partData.status || 'ACTIVE',
              manufacturerName: partData.manufacturer_info,
              requiresSerialTracking: partData.requiresSerial || false,
              isOutsourced: partData.isOutsourced || false
            }
          });
          partsCreated++;
        }
      }

      // Progress indicator for large datasets
      if (i % 200 === 0) {
        console.log(`     📊 Processed ${Math.min(i + batchSize, partEntries.length)} / ${partEntries.length} parts`);
      }
    }

    return { partsCreated, total: partEntries.length };
  }

  async seedAssemblies() {
    const assembliesPath = path.join(__dirname, '../resources/assemblies.json');
    const assembliesData = JSON.parse(await fs.readFile(assembliesPath, 'utf-8'));
    
    let assembliesCreated = 0;
    let componentsCreated = 0;
    const batchSize = 25;
    const assemblyEntries = Object.entries(assembliesData.assemblies);

    // First pass: Create assemblies without components
    for (let i = 0; i < assemblyEntries.length; i += batchSize) {
      const batch = assemblyEntries.slice(i, i + batchSize);
      
      for (const [assemblyId, assemblyData] of batch) {
        const existing = await this.prisma.assembly.findUnique({
          where: { assemblyId }
        });

        if (!existing) {
          await this.prisma.assembly.create({
            data: {
              assemblyId,
              name: assemblyData.name,
              type: assemblyData.type || 'ASSEMBLY',
              categoryCode: assemblyData.categoryCode,
              subcategoryCode: assemblyData.subcategoryCode,
              requiresSerialTracking: assemblyData.requiresSerial || false,
              isOutsourced: assemblyData.isOutsourced || false
            }
          });
          assembliesCreated++;
        }
      }

      if (i % 100 === 0) {
        console.log(`     📊 Created ${Math.min(i + batchSize, assemblyEntries.length)} / ${assemblyEntries.length} assemblies`);
      }
    }

    // Second pass: Create assembly components
    for (const [assemblyId, assemblyData] of assemblyEntries) {
      if (assemblyData.components && assemblyData.components.length > 0) {
        for (const component of assemblyData.components) {
          // Verify the referenced part/assembly exists
          const partExists = component.partId ? 
            await this.prisma.part.findUnique({ where: { partId: component.partId } }) : null;
          const assemblyExists = component.assemblyId ? 
            await this.prisma.assembly.findUnique({ where: { assemblyId: component.assemblyId } }) : null;

          if (partExists || assemblyExists) {
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
    }

    return { assembliesCreated, componentsCreated, total: assemblyEntries.length };
  }

  async seedQcTemplates() {
    const qcTemplates = [
      {
        name: 'Final Quality Check',
        description: 'Comprehensive final quality control inspection',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: [
          {
            section: 'Visual Inspection',
            checklistItem: 'Overall finish quality check',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 1
          },
          {
            section: 'Functional Test',
            checklistItem: 'Drainage system functionality test',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 2
          },
          {
            section: 'Documentation',
            checklistItem: 'Serial number verification and recording',
            itemType: 'TEXT_INPUT',
            isRequired: true,
            order: 3
          }
        ]
      },
      {
        name: 'Pre-Production Check',
        description: 'Pre-production quality verification',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: [
          {
            section: 'Material Inspection',
            checklistItem: 'Material certification verification',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 1
          },
          {
            section: 'Component Check',
            checklistItem: 'All required parts present and correct',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 2
          }
        ]
      }
    ];

    let templatesCreated = 0;
    let itemsCreated = 0;

    for (const templateData of qcTemplates) {
      const existing = await this.prisma.qcFormTemplate.findFirst({
        where: { name: templateData.name }
      });

      if (!existing) {
        const template = await this.prisma.qcFormTemplate.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            appliesToProductFamily: templateData.appliesToProductFamily,
            isActive: templateData.isActive,
            items: {
              create: templateData.items
            }
          }
        });
        templatesCreated++;
        itemsCreated += templateData.items.length;
      }
    }

    return { templatesCreated, itemsCreated };
  }

  async seedTaskTemplates() {
    const taskTemplates = [
      {
        name: 'Standard Assembly Task',
        description: 'Standard assembly workflow task',
        estimatedHours: 2.5,
        assignedToRole: 'ASSEMBLER',
        workInstructions: 'Follow standard assembly procedures for CleanStation units'
      },
      {
        name: 'QC Inspection Task',
        description: 'Quality control inspection task',
        estimatedHours: 1.0,
        assignedToRole: 'QC_PERSON',
        workInstructions: 'Perform comprehensive quality inspection per QC template'
      }
    ];

    let templatesCreated = 0;

    for (const templateData of taskTemplates) {
      const existing = await this.prisma.taskTemplate.findFirst({
        where: { name: templateData.name }
      });

      if (!existing) {
        await this.prisma.taskTemplate.create({
          data: templateData
        });
        templatesCreated++;
      }
    }

    return { templatesCreated };
  }

  async seedNotificationPreferences() {
    // Get all users to set up default notification preferences
    const users = await this.prisma.user.findMany();
    let preferencesCreated = 0;

    const defaultNotificationTypes = [
      'ORDER_STATUS_CHANGED',
      'QC_APPROVAL_REQUIRED',
      'TASK_ASSIGNED',
      'PARTS_SHORTAGE'
    ];

    for (const user of users) {
      for (const notificationType of defaultNotificationTypes) {
        const existing = await this.prisma.notificationPreference.findUnique({
          where: {
            userId_notificationType: {
              userId: user.id,
              notificationType
            }
          }
        });

        if (!existing) {
          await this.prisma.notificationPreference.create({
            data: {
              userId: user.id,
              notificationType,
              inAppEnabled: true,
              emailEnabled: user.role === 'ADMIN' || user.role === 'PRODUCTION_COORDINATOR',
              frequency: 'IMMEDIATE'
            }
          });
          preferencesCreated++;
        }
      }
    }

    return { preferencesCreated, users: users.length };
  }

  logSuccess(moduleName, result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      module: moduleName,
      status: 'SUCCESS',
      result
    };
    this.seedingLog.push(logEntry);
    console.log(`   ✅ ${moduleName}: ${JSON.stringify(result)}`);
  }

  logError(moduleName, error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      module: moduleName,
      status: 'ERROR',
      error: error.message
    };
    this.seedingLog.push(logEntry);
    console.error(`   ❌ ${moduleName}: ${error.message}`);
  }

  async generateSeedingReport() {
    const reportPath = path.join(__dirname, '../reports');
    await fs.mkdir(reportPath, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: 'Transaction-Based Seeding Report',
      seedingLog: this.seedingLog,
      totalModules: this.seedingLog.length,
      successfulModules: this.seedingLog.filter(log => log.status === 'SUCCESS').length,
      failedModules: this.seedingLog.filter(log => log.status === 'ERROR').length
    };
    
    const reportFile = path.join(reportPath, `seeding-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📊 Seeding report saved to: ${reportFile}`);
    return report;
  }

  async cleanup() {
    await this.prisma.$disconnect();
  }
}

// Rollback utility for emergency situations
class SeedingRollbackManager {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async performEmergencyRollback() {
    console.log('🚨 EMERGENCY ROLLBACK: Clearing all seeded data...');
    
    try {
      // Delete in reverse dependency order
      await this.prisma.notificationPreference.deleteMany({});
      await this.prisma.taskTemplate.deleteMany({});
      await this.prisma.qcFormTemplateItem.deleteMany({});
      await this.prisma.qcFormTemplate.deleteMany({});
      await this.prisma.assemblyComponent.deleteMany({});
      await this.prisma.assembly.deleteMany({});
      await this.prisma.part.deleteMany({});
      await this.prisma.subcategory.deleteMany({});
      await this.prisma.category.deleteMany({});
      await this.prisma.user.deleteMany({
        where: {
          username: {
            in: ['admin', 'qc_inspector', 'production_coord']
          }
        }
      });

      console.log('✅ Emergency rollback completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Emergency rollback failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Main execution function
async function runTransactionSeeding() {
  const manager = new TransactionSeedingManager();
  
  try {
    console.log('🚀 Starting Transaction-Based Seeding Manager...');
    console.log('💡 This process uses database transactions for atomicity');
    
    await manager.startTransaction();
    
    const report = await manager.generateSeedingReport();
    console.log('\n🎉 Transaction-based seeding completed successfully!');
    console.log(`📈 Summary: ${report.successfulModules}/${report.totalModules} modules seeded`);
    
    return report;
    
  } catch (error) {
    console.error('\n💥 Transaction seeding failed:', error.message);
    console.log('🔄 All changes have been automatically rolled back');
    throw error;
  } finally {
    await manager.cleanup();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    const rollbackManager = new SeedingRollbackManager();
    rollbackManager.performEmergencyRollback()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    runTransactionSeeding()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { 
  TransactionSeedingManager, 
  SeedingRollbackManager, 
  runTransactionSeeding 
};