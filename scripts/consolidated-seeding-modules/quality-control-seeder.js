/**
 * Quality Control Seeder Module
 * 
 * Handles seeding of QC templates, inspection standards, and quality control workflows
 * for ISO 13485:2016 medical device manufacturing compliance
 */

class QualityControlSeeder {
  constructor(prismaClient) {
    this.prisma = prismaClient;
    this.moduleName = 'QualityControlSeeder';
  }

  async seed() {
    console.log('   🔍 Seeding quality control templates and standards...');
    
    const results = {
      qcTemplates: 0,
      qcItems: 0,
      totalItems: 0
    };

    const qcResult = await this.seedQcTemplates();
    results.qcTemplates = qcResult.templates;
    results.qcItems = qcResult.items;
    results.totalItems = qcResult.templates + qcResult.items;

    return results;
  }

  async seedQcTemplates() {
    const qcTemplates = [
      {
        name: 'Final Quality Control - CleanStation T2',
        description: 'Comprehensive final quality control inspection for CleanStation T2 series',
        appliesToProductFamily: 'MDRD_T2_SINK',
        version: '2.1',
        isActive: true,
        items: [
          {
            section: 'Visual Inspection',
            checklistItem: 'Overall finish quality and surface integrity',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 1,
            toleranceSpec: 'No visible scratches, dents, or surface defects'
          },
          {
            section: 'Visual Inspection',
            checklistItem: 'Basin alignment and levelness verification',
            itemType: 'NUMERIC_INPUT',
            isRequired: true,
            order: 2,
            toleranceSpec: 'Basin level within ±2mm tolerance'
          },
          {
            section: 'Functional Testing',
            checklistItem: 'Drainage system flow rate test',
            itemType: 'NUMERIC_INPUT',
            isRequired: true,
            order: 3,
            toleranceSpec: 'Flow rate 15-25 L/min per basin'
          },
          {
            section: 'Functional Testing',
            checklistItem: 'Faucet operation and water pressure test',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 4,
            toleranceSpec: 'Smooth operation, no leaks, adequate pressure'
          },
          {
            section: 'Electrical Safety',
            checklistItem: 'Ground continuity test (if applicable)',
            itemType: 'NUMERIC_INPUT',
            isRequired: false,
            order: 5,
            toleranceSpec: 'Ground resistance < 0.1 ohm'
          },
          {
            section: 'Documentation',
            checklistItem: 'Serial number verification and recording',
            itemType: 'TEXT_INPUT',
            isRequired: true,
            order: 6,
            toleranceSpec: 'Serial number must match BOM and be legible'
          },
          {
            section: 'Compliance',
            checklistItem: 'Medical device labeling completeness',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 7,
            toleranceSpec: 'All required FDA/CE markings present and correct'
          }
        ]
      },
      {
        name: 'Pre-Production Quality Check - CleanStation T2',
        description: 'Pre-production quality verification and material inspection',
        appliesToProductFamily: 'MDRD_T2_SINK',
        version: '1.5',
        isActive: true,
        items: [
          {
            section: 'Material Inspection',
            checklistItem: 'Stainless steel grade certification verification',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 1,
            toleranceSpec: '316L stainless steel certification required'
          },
          {
            section: 'Material Inspection',
            checklistItem: 'Basin dimension verification',
            itemType: 'NUMERIC_INPUT',
            isRequired: true,
            order: 2,
            toleranceSpec: 'Dimensions within ±3mm of specification'
          },
          {
            section: 'Component Verification',
            checklistItem: 'All required parts present per BOM',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 3,
            toleranceSpec: '100% BOM compliance - no missing parts'
          },
          {
            section: 'Component Verification',
            checklistItem: 'Leg assembly kit completeness',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 4,
            toleranceSpec: 'All fasteners, adjusters, and components present'
          },
          {
            section: 'Quality Documentation',
            checklistItem: 'Incoming inspection records complete',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 5,
            toleranceSpec: 'All material certificates and test reports on file'
          }
        ]
      },
      {
        name: 'In-Process Quality Check - Assembly',
        description: 'Quality control checks during assembly process',
        appliesToProductFamily: 'MDRD_T2_SINK',
        version: '1.2',
        isActive: true,
        items: [
          {
            section: 'Welding Quality',
            checklistItem: 'Weld quality and penetration inspection',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 1,
            toleranceSpec: 'Full penetration welds, no porosity or cracks'
          },
          {
            section: 'Assembly Accuracy',
            checklistItem: 'Frame squareness measurement',
            itemType: 'NUMERIC_INPUT',
            isRequired: true,
            order: 2,
            toleranceSpec: 'Diagonal measurements within ±2mm'
          },
          {
            section: 'Surface Finish',
            checklistItem: 'Passivation and surface finish quality',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 3,
            toleranceSpec: 'Uniform finish, no discoloration or contamination'
          }
        ]
      },
      {
        name: 'Packaging Quality Control',
        description: 'Final packaging and shipping preparation QC',
        appliesToProductFamily: 'MDRD_T2_SINK',
        version: '1.0',
        isActive: true,
        items: [
          {
            section: 'Packaging Integrity',
            checklistItem: 'Protective packaging completeness',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 1,
            toleranceSpec: 'All surfaces protected, no contact points exposed'
          },
          {
            section: 'Documentation Package',
            checklistItem: 'Installation manual and documentation complete',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 2,
            toleranceSpec: 'Manual, warranty card, and certificates included'
          },
          {
            section: 'Shipping Labels',
            checklistItem: 'Shipping labels and handling instructions',
            itemType: 'PASS_FAIL',
            isRequired: true,
            order: 3,
            toleranceSpec: 'Correct shipping labels, fragile stickers applied'
          }
        ]
      }
    ];

    let templatesCreated = 0;
    let itemsCreated = 0;

    for (const templateData of qcTemplates) {
      const existing = await this.prisma.qcFormTemplate.findFirst({
        where: { 
          name: templateData.name,
          version: templateData.version 
        }
      });

      if (!existing) {
        const template = await this.prisma.qcFormTemplate.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            appliesToProductFamily: templateData.appliesToProductFamily,
            version: templateData.version,
            isActive: templateData.isActive,
            items: {
              create: templateData.items.map(item => ({
                section: item.section,
                checklistItem: item.checklistItem,
                itemType: item.itemType,
                isRequired: item.isRequired,
                order: item.order
              }))
            }
          }
        });
        
        templatesCreated++;
        itemsCreated += templateData.items.length;
        
        console.log(`       ✅ Created QC template: ${templateData.name} (${templateData.items.length} items)`);
      }
    }

    return { templates: templatesCreated, items: itemsCreated };
  }
}

module.exports = QualityControlSeeder;