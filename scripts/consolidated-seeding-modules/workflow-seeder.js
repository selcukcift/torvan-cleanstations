/**
 * Workflow Seeder Module
 * 
 * Handles seeding of workflow-related data: task templates, notification preferences,
 * and process definitions for the CleanStation manufacturing workflow
 */

class WorkflowSeeder {
  constructor(prismaClient) {
    this.prisma = prismaClient;
    this.moduleName = 'WorkflowSeeder';
  }

  async seed() {
    console.log('   🔄 Seeding workflow templates and processes...');
    
    const results = {
      taskTemplates: 0,
      notificationPreferences: 0,
      totalItems: 0
    };

    const taskResult = await this.seedTaskTemplates();
    results.taskTemplates = taskResult.created;

    const notificationResult = await this.seedNotificationPreferences();
    results.notificationPreferences = notificationResult.created;

    results.totalItems = results.taskTemplates + results.notificationPreferences;
    return results;
  }

  async seedTaskTemplates() {
    const taskTemplates = [
      {
        name: 'Standard Assembly Task - CleanStation T2',
        description: 'Standard assembly workflow for CleanStation T2 series sinks',
        estimatedHours: 4.5,
        assignedToRole: 'ASSEMBLER',
        workInstructions: 'Follow CleanStation T2 assembly manual sections 1-8. Ensure all welds meet specification and torque values are per drawing.',
        requiredSkills: ['TIG Welding', 'Precision Assembly', 'Blueprint Reading'],
        safetyRequirements: 'Safety glasses, welding helmet, cut-resistant gloves required'
      },
      {
        name: 'Basin Installation Task',
        description: 'Basin installation and alignment for multi-basin configurations',
        estimatedHours: 2.0,
        assignedToRole: 'ASSEMBLER',
        workInstructions: 'Install basins per configuration drawing. Verify level within ±2mm tolerance. Test drainage flow.',
        requiredSkills: ['Precision Assembly', 'Level/Alignment'],
        safetyRequirements: 'Safety glasses, back support for lifting'
      },
      {
        name: 'Electrical System Integration',
        description: 'Integration of electrical components and control systems',
        estimatedHours: 3.0,
        assignedToRole: 'ASSEMBLER',
        workInstructions: 'Install control box, wire according to electrical schematic. Perform continuity and ground tests.',
        requiredSkills: ['Electrical Wiring', 'Control Systems', 'Testing Equipment'],
        safetyRequirements: 'Electrical safety training, insulated tools, lockout/tagout procedures'
      },
      {
        name: 'Pre-Production Quality Inspection',
        description: 'Pre-production quality control inspection',
        estimatedHours: 1.5,
        assignedToRole: 'QC_PERSON',
        workInstructions: 'Perform pre-production QC checklist. Verify material certifications and dimensional compliance.',
        requiredSkills: ['Quality Inspection', 'Material Verification', 'Measurement Tools'],
        safetyRequirements: 'Safety glasses, appropriate PPE for inspection area'
      },
      {
        name: 'Final Quality Control Inspection',
        description: 'Comprehensive final quality control inspection',
        estimatedHours: 2.0,
        assignedToRole: 'QC_PERSON',
        workInstructions: 'Complete final QC template. Test all functions, verify documentation, apply QC approval.',
        requiredSkills: ['Quality Inspection', 'Functional Testing', 'Documentation'],
        safetyRequirements: 'Safety glasses, appropriate PPE for testing procedures'
      },
      {
        name: 'Packaging and Shipping Preparation',
        description: 'Final packaging and preparation for shipment',
        estimatedHours: 1.0,
        assignedToRole: 'PRODUCTION_COORDINATOR',
        workInstructions: 'Apply protective packaging, include documentation package, prepare shipping labels.',
        requiredSkills: ['Packaging', 'Documentation Management', 'Shipping Procedures'],
        safetyRequirements: 'Safety glasses, proper lifting techniques'
      },
      {
        name: 'Rework Task - QC Rejection',
        description: 'Rework task for QC rejected items',
        estimatedHours: 3.0,
        assignedToRole: 'ASSEMBLER',
        workInstructions: 'Review QC rejection notes. Perform required rework per engineering guidance. Re-submit for QC.',
        requiredSkills: ['Problem Solving', 'Rework Procedures', 'Quality Recovery'],
        safetyRequirements: 'Additional PPE as required for rework operations'
      },
      {
        name: 'Parts Procurement Verification',
        description: 'Verification of procured parts and materials',
        estimatedHours: 0.5,
        assignedToRole: 'PROCUREMENT_SPECIALIST',
        workInstructions: 'Verify incoming parts against purchase order. Check material certifications and quantities.',
        requiredSkills: ['Procurement', 'Material Verification', 'Documentation'],
        safetyRequirements: 'Safety glasses, proper lifting techniques for material handling'
      }
    ];

    let templatesCreated = 0;

    for (const templateData of taskTemplates) {
      const existing = await this.prisma.taskTemplate.findFirst({
        where: { name: templateData.name }
      });

      if (!existing) {
        await this.prisma.taskTemplate.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            appliesToProductFamily: 'MDRD_T2_SINK',
            version: '1.0',
            isActive: true
          }
        });
        templatesCreated++;
        
        console.log(`       ✅ Created task template: ${templateData.name}`);
      }
    }

    return { created: templatesCreated, total: taskTemplates.length };
  }

  async seedNotificationPreferences() {
    // Get all existing users to set up notification preferences
    const users = await this.prisma.user.findMany();
    let preferencesCreated = 0;

    const notificationTypes = [
      'ORDER_STATUS_CHANGE',
      'QC_APPROVAL_REQUIRED', 
      'TASK_ASSIGNMENT',
      'ASSEMBLY_MILESTONE',
      'SYSTEM_ALERT',
      'INVENTORY_LOW',
      'DEADLINE_APPROACHING'
    ];

    // Role-based notification preferences
    const rolePreferences = {
      'ADMIN': {
        emailEnabled: true,
        frequency: 'IMMEDIATE',
        types: notificationTypes // All notifications
      },
      'PRODUCTION_COORDINATOR': {
        emailEnabled: true,
        frequency: 'IMMEDIATE', 
        types: ['ORDER_STATUS_CHANGE', 'QC_APPROVAL_REQUIRED', 'ASSEMBLY_MILESTONE', 'DEADLINE_APPROACHING']
      },
      'QC_PERSON': {
        emailEnabled: true,
        frequency: 'IMMEDIATE',
        types: ['QC_APPROVAL_REQUIRED', 'ORDER_STATUS_CHANGE', 'SYSTEM_ALERT']
      },
      'ASSEMBLER': {
        emailEnabled: false,
        frequency: 'IMMEDIATE',
        types: ['TASK_ASSIGNMENT', 'ASSEMBLY_MILESTONE']
      },
      'PROCUREMENT_SPECIALIST': {
        emailEnabled: true,
        frequency: 'DAILY',
        types: ['INVENTORY_LOW', 'ORDER_STATUS_CHANGE']
      }
    };

    for (const user of users) {
      const preferences = rolePreferences[user.role] || rolePreferences['ASSEMBLER'];
      
      for (const notificationType of preferences.types) {
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
              emailEnabled: preferences.emailEnabled,
              frequency: preferences.frequency,
              isActive: true
            }
          });
          preferencesCreated++;
        }
      }
    }

    console.log(`       ✅ Created notification preferences for ${users.length} users`);
    return { created: preferencesCreated, users: users.length };
  }
}

module.exports = WorkflowSeeder;