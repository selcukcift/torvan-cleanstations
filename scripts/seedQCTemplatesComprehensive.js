const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedComprehensiveQCTemplates() {
  console.log('🔄 Starting comprehensive QC template seeding...')

  try {
    // Clear existing QC templates
    await prisma.qcFormTemplateItem.deleteMany({})
    await prisma.qcFormTemplate.deleteMany({})
    
    console.log('✅ Cleared existing QC templates')

    // 1. PRE-PRODUCTION CHECK (CLP.T2.001.V01 - Section 1)
    const preProductionTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Pre-Production Check',
        version: '1.0',
        description: 'Pre-production inspection based on CLP.T2.001.V01 Section 1',
        isActive: true,
        appliesToProductFamily: 'T2 Sink'
      }
    })

    const preProductionItems = [
      // General Information
      {
        section: 'General Information',
        checklistItem: 'Job ID',
        itemType: 'TEXT_INPUT',
        order: 1,
        isRequired: true,
        notesPrompt: 'Enter the job identification number'
      },
      {
        section: 'General Information', 
        checklistItem: 'Number of Basins',
        itemType: 'NUMERIC_INPUT',
        order: 2,
        isRequired: true,
        notesPrompt: 'Enter total number of basins for this sink'
      },
      {
        section: 'General Information',
        checklistItem: 'Inspector Initials',
        itemType: 'TEXT_INPUT',
        order: 3,
        isRequired: true,
        notesPrompt: 'Enter inspector initials for traceability'
      },
      
      // Dimensional Checks
      {
        section: 'Dimensional Verification',
        checklistItem: 'Final Sink Dimensions, basin dimensions, & BOM verified',
        itemType: 'PASS_FAIL',
        order: 4,
        isRequired: true,
        notesPrompt: 'Check dimensions of entire sink, each basin, and any dimension mentioned on drawing'
      },
      {
        section: 'Dimensional Verification',
        checklistItem: 'Final approved drawing and paperwork attached',
        itemType: 'PASS_FAIL', 
        order: 5,
        isRequired: true,
        notesPrompt: 'Verify final approved drawing and paperwork are digitally attached'
      },
      {
        section: 'Dimensional Verification',
        checklistItem: 'Pegboard installed - dimensions match drawing',
        itemType: 'PASS_FAIL',
        order: 6,
        isRequired: false,
        applicabilityCondition: 'pegboard_selected',
        notesPrompt: 'Verify pegboard installation and dimensions match drawing (N/A if no pegboard)'
      },
      {
        section: 'Dimensional Verification',
        checklistItem: 'Sink faucet holes and mounting holes location match drawing/order',
        itemType: 'PASS_FAIL',
        order: 7,
        isRequired: true,
        notesPrompt: 'Verify faucet hole locations match drawing and customer order requirements'
      },
      
      // Feet Type Verification
      {
        section: 'Feet Configuration',
        checklistItem: 'Sink feet type verification',
        itemType: 'SINGLE_SELECT',
        options: ['Lock & levelling castors', 'Levelling Feet'],
        order: 8,
        isRequired: true,
        notesPrompt: 'Verify correct feet type is installed'
      }
    ]

    // Basin-specific checks (repeated for up to 3 basins)
    for (let basinNum = 1; basinNum <= 3; basinNum++) {
      const basinItems = [
        {
          section: `Basin ${basinNum} Verification`,
          checklistItem: 'Bottom fill hole present',
          itemType: 'PASS_FAIL',
          order: 10 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} has bottom fill hole`
        },
        {
          section: `Basin ${basinNum} Verification`,
          checklistItem: 'Drain Button present',
          itemType: 'PASS_FAIL',
          order: 11 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} has drain button`
        },
        {
          section: `Basin ${basinNum} Verification`,
          checklistItem: 'Basin Light present',
          itemType: 'PASS_FAIL',
          order: 12 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} has basin light (N/A if not ordered)`
        },
        {
          section: `Basin ${basinNum} Verification`,
          checklistItem: 'Drain Location',
          itemType: 'SINGLE_SELECT',
          options: ['Center', 'Other'],
          order: 13 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} drain location`
        },
        {
          section: `Basin ${basinNum} Verification`,
          checklistItem: 'Sink Faucet Location',
          itemType: 'SINGLE_SELECT',
          options: basinNum === 1 ? ['Center of basin', 'Between Basins 1/2'] :
                   basinNum === 2 ? ['Between Basins 1/2', 'Between Basins 2/3', 'Center'] :
                   ['Between Basins 2/3', 'Center'],
          order: 14 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} faucet location`
        }
      ]
      preProductionItems.push(...basinItems)
    }

    // Create pre-production template items
    for (const item of preProductionItems) {
      await prisma.qcFormTemplateItem.create({
        data: {
          templateId: preProductionTemplate.id,
          ...item
        }
      })
    }

    console.log('✅ Created Pre-Production Check template with', preProductionItems.length, 'items')

    // 2. PRODUCTION CHECK (CLP.T2.001.V01 - Section 2)
    const productionTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Production Check',
        version: '1.0', 
        description: 'Production inspection based on CLP.T2.001.V01 Section 2',
        isActive: true,
        appliesToProductFamily: 'T2 Sink'
      }
    })

    const productionItems = [
      // Order Information
      {
        section: 'Order Information',
        checklistItem: 'PO Number',
        itemType: 'TEXT_INPUT',
        order: 1,
        isRequired: true,
        notesPrompt: 'Enter purchase order number'
      },
      {
        section: 'Order Information',
        checklistItem: 'Build Number',
        itemType: 'TEXT_INPUT',
        order: 2,
        isRequired: true,
        notesPrompt: 'Enter build number for this specific sink'
      },
      
      // Installation Checks
      {
        section: 'LED and Lighting',
        checklistItem: 'Sink Overhead LED Light Bracket mounted with plastic washers',
        itemType: 'PASS_FAIL',
        order: 3,
        isRequired: false,
        applicabilityCondition: 'pegboard_selected',
        notesPrompt: 'Verify LED bracket installed with plastic washers (N/A if no pegboard)'
      },
      {
        section: 'LED and Lighting',
        checklistItem: 'Sink Overhead LED Light button lasered and installed',
        itemType: 'PASS_FAIL',
        order: 4,
        isRequired: false,
        applicabilityCondition: 'overhead_light_selected',
        notesPrompt: 'Verify LED light button is properly labeled and installed (N/A if no overhead light)'
      },
      
      // Faucets and Controls
      {
        section: 'Faucets and Controls',
        checklistItem: 'Standard Basin Faucets installed',
        itemType: 'PASS_FAIL',
        order: 5,
        isRequired: false,
        applicabilityCondition: 'faucets_ordered',
        notesPrompt: 'Verify standard basin faucets are installed (N/A if not ordered)'
      },
      {
        section: 'Faucets and Controls',
        checklistItem: 'Lifters Control Button Type',
        itemType: 'SINGLE_SELECT',
        options: ['DPF1K (Non-Programmable)', 'DP1C (Programmable)'],
        order: 6,
        isRequired: true,
        notesPrompt: 'Verify correct lifter control button type is installed'
      },
      {
        section: 'Faucets and Controls',
        checklistItem: 'Lifter Controller installed underneath sink',
        itemType: 'PASS_FAIL',
        order: 7,
        isRequired: true,
        notesPrompt: 'Verify lifter controller is properly installed underneath sink'
      },
      
      // Branding and Power
      {
        section: 'Branding and Power',
        checklistItem: 'Torvan Logo attached on left side of sink',
        itemType: 'PASS_FAIL',
        order: 8,
        isRequired: false,
        applicabilityCondition: 'logo_required',
        notesPrompt: 'Verify Torvan logo is attached to left side of sink (N/A if not required)'
      },
      {
        section: 'Branding and Power',
        checklistItem: 'Power Bar installed',
        itemType: 'PASS_FAIL',
        order: 9,
        isRequired: true,
        notesPrompt: 'Verify power bar is properly installed'
      },
      {
        section: 'Branding and Power',
        checklistItem: 'Necessary control boxes installed (E-Drain, E-Sink)',
        itemType: 'PASS_FAIL',
        order: 10,
        isRequired: false,
        applicabilityCondition: 'control_boxes_required',
        notesPrompt: 'Verify appropriate control boxes are installed (N/A if no electronic basins)'
      },
      {
        section: 'Branding and Power',
        checklistItem: 'All cables labeled with D# or S#, Overhead Light cables labeled L4 & S4',
        itemType: 'PASS_FAIL',
        order: 11,
        isRequired: false,
        applicabilityCondition: 'cables_present',
        notesPrompt: 'Verify all cables are properly labeled (N/A if no cables)'
      },
      
      // Cleanliness
      {
        section: 'Final Inspection',
        checklistItem: 'Sink is clean of metal shavings and waste',
        itemType: 'PASS_FAIL',
        order: 12,
        isRequired: true,
        notesPrompt: 'Verify sink is thoroughly cleaned of metal shavings and waste'
      },
      
      // Extra Components
      {
        section: 'Extra Components',
        checklistItem: 'Air Gun components (BL-4350-01 and BL-5500-07) installed',
        itemType: 'PASS_FAIL',
        order: 13,
        isRequired: false,
        applicabilityCondition: 'air_gun_ordered',
        notesPrompt: 'Verify air gun components are installed (N/A if not ordered)'
      },
      {
        section: 'Extra Components',
        checklistItem: 'Water Gun components (BL-4500-02 and BL-4249) installed',
        itemType: 'PASS_FAIL',
        order: 14,
        isRequired: false,
        applicabilityCondition: 'water_gun_ordered',
        notesPrompt: 'Verify water gun components are installed (N/A if not ordered)'
      },
      {
        section: 'Extra Components',
        checklistItem: 'DI Faucet installed',
        itemType: 'PASS_FAIL',
        order: 15,
        isRequired: false,
        applicabilityCondition: 'di_faucet_ordered',
        notesPrompt: 'Verify DI faucet is installed (N/A if not ordered)'
      },
      {
        section: 'Extra Components',
        checklistItem: 'Combo Basin Faucet installed',
        itemType: 'PASS_FAIL',
        order: 16,
        isRequired: false,
        applicabilityCondition: 'combo_faucet_ordered',
        notesPrompt: 'Verify combo basin faucet is installed (N/A if not ordered)'
      }
    ]

    // Create production template items
    for (const item of productionItems) {
      await prisma.qcFormTemplateItem.create({
        data: {
          templateId: productionTemplate.id,
          ...item
        }
      })
    }

    console.log('✅ Created Production Check template with', productionItems.length, 'items')

    // 3. BASIN PRODUCTION CHECK (CLP.T2.001.V01 - Section 3)
    const basinProductionTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Basin Production Check',
        version: '1.0',
        description: 'Basin-specific production checks based on CLP.T2.001.V01 Section 3',
        isActive: true,
        appliesToProductFamily: 'T2 Sink'
      }
    })

    const basinProductionItems = []

    // E-DRAIN BASIN CHECKS (for each basin)
    for (let basinNum = 1; basinNum <= 3; basinNum++) {
      const eDrainItems = [
        {
          section: `E-Drain Basin ${basinNum}`,
          checklistItem: 'Bottom-Fill Mixing Valve & Faucet installed',
          itemType: 'PASS_FAIL',
          order: 100 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Verify E-Drain Basin ${basinNum} has mixing valve and faucet installed`
        },
        {
          section: `E-Drain Basin ${basinNum}`,
          checklistItem: 'Bottom Fill Assembly installed correctly',
          itemType: 'PASS_FAIL',
          order: 101 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Verify complete bottom fill assembly: Mixing Valve → Adapter → Check valve → PEX Adaptor → PEX Piping → Bottom Fill hole`
        },
        {
          section: `E-Drain Basin ${basinNum}`,
          checklistItem: 'Pipes labeled as Hot Water and Cold Water',
          itemType: 'PASS_FAIL',
          order: 102 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Verify pipes are properly labeled for Basin ${basinNum}`
        },
        {
          section: `E-Drain Basin ${basinNum}`,
          checklistItem: 'Overflow sensor installed',
          itemType: 'PASS_FAIL',
          order: 103 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Verify overflow sensor is installed for E-Drain Basin ${basinNum}`
        }
      ]
      basinProductionItems.push(...eDrainItems)

      // E-SINK BASIN CHECKS (for each basin)
      const eSinkItems = [
        {
          section: `E-Sink Basin ${basinNum}`,
          checklistItem: 'Mixing Valve plate installed',
          itemType: 'PASS_FAIL',
          order: 200 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify mixing valve plate is installed for E-Sink Basin ${basinNum}`
        },
        {
          section: `E-Sink Basin ${basinNum}`,
          checklistItem: 'Emergency Stop buttons installed',
          itemType: 'PASS_FAIL',
          order: 201 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify emergency stop buttons are installed for E-Sink Basin ${basinNum}`
        },
        {
          section: `E-Sink Basin ${basinNum}`,
          checklistItem: 'E-Sink touchscreen mounted onto Sink',
          itemType: 'PASS_FAIL',
          order: 202 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify touchscreen is mounted for E-Sink Basin ${basinNum}`
        },
        {
          section: `E-Sink Basin ${basinNum}`,
          checklistItem: 'E-Sink touchscreen connected to E-Sink Control Box',
          itemType: 'PASS_FAIL',
          order: 203 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify touchscreen is connected to control box for E-Sink Basin ${basinNum}`
        },
        {
          section: `E-Sink Basin ${basinNum}`,
          checklistItem: 'Overflow sensor installed',
          itemType: 'PASS_FAIL',
          order: 204 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify overflow sensor is installed for E-Sink Basin ${basinNum}`
        },
        {
          section: `E-Sink Basin ${basinNum}`,
          checklistItem: 'Dosing port installed on backsplash',
          itemType: 'PASS_FAIL',
          order: 205 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify dosing port is installed on backsplash for E-Sink Basin ${basinNum}`
        },
        {
          section: `E-Sink Basin ${basinNum}`,
          checklistItem: 'Basin temperature cable gland installed on backsplash',
          itemType: 'PASS_FAIL',
          order: 206 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify temperature cable gland is installed for E-Sink Basin ${basinNum}`
        }
      ]
      basinProductionItems.push(...eSinkItems)
    }

    // Create basin production template items
    for (const item of basinProductionItems) {
      await prisma.qcFormTemplateItem.create({
        data: {
          templateId: basinProductionTemplate.id,
          ...item
        }
      })
    }

    console.log('✅ Created Basin Production Check template with', basinProductionItems.length, 'items')

    // 4. PACKAGING VERIFICATION (CLP.T2.001.V01 - Section 4)
    const packagingTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Packaging Verification',
        version: '1.0',
        description: 'Standard packaging and kits verification based on CLP.T2.001.V01 Section 4',
        isActive: true,
        appliesToProductFamily: 'T2 Sink'
      }
    })

    const packagingItems = [
      // Standard Items
      {
        section: 'Standard Items',
        checklistItem: 'Anti-Fatigue Mat included',
        itemType: 'PASS_FAIL',
        order: 1,
        isRequired: true,
        notesPrompt: 'Verify anti-fatigue mat is included'
      },
      {
        section: 'Standard Items',
        checklistItem: 'Sink strainer per sink bowl (lasered with Torvan Medical logo)',
        itemType: 'PASS_FAIL',
        order: 2,
        isRequired: true,
        notesPrompt: 'Verify sink strainers are included and properly lasered'
      },
      {
        section: 'Standard Items',
        checklistItem: 'Ø1.5 Flex Hose (4ft) per sink drain + 2x Hose Clamps',
        itemType: 'PASS_FAIL',
        order: 3,
        isRequired: true,
        notesPrompt: 'Verify flex hose and clamps are included per drain'
      },
      {
        section: 'Standard Items',
        checklistItem: '1x Temp. Sensor packed per E-Drain basin',
        itemType: 'PASS_FAIL',
        order: 4,
        isRequired: false,
        applicabilityCondition: 'e_drain_basins_present',
        notesPrompt: 'Verify temperature sensors for E-Drain basins (N/A if no E-Drain basins)'
      },
      {
        section: 'Standard Items',
        checklistItem: '1x Electronic Drain Solenoid per Basin (Wired, tested and labelled)',
        itemType: 'PASS_FAIL',
        order: 5,
        isRequired: true,
        notesPrompt: 'Verify drain solenoids are wired, tested, and labeled per basin'
      },
      {
        section: 'Standard Items',
        checklistItem: '1x Drain assembly per basin',
        itemType: 'PASS_FAIL',
        order: 6,
        isRequired: true,
        notesPrompt: 'Verify drain assemblies are included per basin'
      },
      {
        section: 'Standard Items',
        checklistItem: '1x shelf for dosing pump, 1x Tubeset per dosing pump',
        itemType: 'PASS_FAIL',
        order: 7,
        isRequired: false,
        applicabilityCondition: 'dosing_pump_present',
        notesPrompt: 'Verify dosing pump shelf and tubesets (N/A if no dosing pumps)'
      },
      {
        section: 'Standard Items',
        checklistItem: 'Drain gasket per basin',
        itemType: 'PASS_FAIL',
        order: 8,
        isRequired: true,
        notesPrompt: 'Verify drain gaskets are included per basin'
      },
      
      // Optional Kits
      {
        section: 'Optional Kits',
        checklistItem: 'Air Gun Kit: 1x 64-20900-00, 1x Gun & Tip Holder Bracket',
        itemType: 'PASS_FAIL',
        order: 9,
        isRequired: false,
        applicabilityCondition: 'air_gun_kit_ordered',
        notesPrompt: 'Verify air gun kit components are included (N/A if not ordered)'
      },
      {
        section: 'Optional Kits',
        checklistItem: 'Water Gun Kit: 1x 64-20900-00, 1x DI Compatible Hose & Water Gun, 1x Gun & Tip Holder Bracket',
        itemType: 'PASS_FAIL',
        order: 10,
        isRequired: false,
        applicabilityCondition: 'water_gun_kit_ordered',
        notesPrompt: 'Verify water gun kit components are included (N/A if not ordered)'
      },
      {
        section: 'Optional Kits',
        checklistItem: 'Pre-Rinse Faucet: 1x B-0133, 1x B-0230-K, 2x PFX146332',
        itemType: 'PASS_FAIL',
        order: 11,
        isRequired: false,
        applicabilityCondition: 'pre_rinse_faucet_ordered',
        notesPrompt: 'Verify pre-rinse faucet kit components (N/A if not ordered)'
      },
      {
        section: 'Optional Kits',
        checklistItem: 'Faucet Kit: 1x B-2342, 1x B-0230-K, 2x PFX146332',
        itemType: 'PASS_FAIL',
        order: 12,
        isRequired: false,
        applicabilityCondition: 'faucet_kit_ordered',
        notesPrompt: 'Verify faucet kit components (N/A if not ordered)'
      },
      
      // Manuals
      {
        section: 'Documentation',
        checklistItem: 'Install & Operations Manual: IFU.T2.SinkInstUser',
        itemType: 'PASS_FAIL',
        order: 13,
        isRequired: true,
        notesPrompt: 'Verify standard installation manual is included'
      },
      {
        section: 'Documentation',
        checklistItem: 'Install & Operations Manual French: IFU.T2.SinkInstUserFR',
        itemType: 'PASS_FAIL',
        order: 14,
        isRequired: false,
        applicabilityCondition: 'french_language_selected',
        notesPrompt: 'Verify French manual is included (N/A if English order)'
      },
      {
        section: 'Documentation',
        checklistItem: 'E-Sink Automation Manual French: IFU.T2.ESinkInstUserFR',
        itemType: 'PASS_FAIL',
        order: 15,
        isRequired: false,
        applicabilityCondition: 'e_sink_present_and_french',
        notesPrompt: 'Verify E-Sink French manual is included (N/A if no E-Sink or English order)'
      }
    ]

    // Create packaging template items
    for (const item of packagingItems) {
      await prisma.qcFormTemplateItem.create({
        data: {
          templateId: packagingTemplate.id,
          ...item
        }
      })
    }

    console.log('✅ Created Packaging Verification template with', packagingItems.length, 'items')

    // 5. FINAL QUALITY CHECK (CLQ.T2.001.V01)
    const finalQualityTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Final Quality Check',
        version: '1.0',
        description: 'Final quality inspection based on CLQ.T2.001.V01',
        isActive: true,
        appliesToProductFamily: 'T2 Sink'
      }
    })

    const finalQualityItems = [
      // Section A - Project Verification
      {
        section: 'Project Verification',
        checklistItem: 'First Pass',
        itemType: 'PASS_FAIL',
        order: 1,
        isRequired: true,
        notesPrompt: 'Is this the first quality check pass?'
      },
      {
        section: 'Project Verification',
        checklistItem: 'Hi-Pot Test Completed',
        itemType: 'PASS_FAIL',
        order: 2,
        isRequired: true,
        notesPrompt: 'Verify hi-pot electrical safety test has been completed'
      },
      {
        section: 'Project Verification',
        checklistItem: 'Project PO matches ordered model (Size, type)',
        itemType: 'PASS_FAIL',
        order: 3,
        isRequired: true,
        notesPrompt: 'Check Project PO and ensure Model matches what has been ordered'
      },
      {
        section: 'Project Verification',
        checklistItem: 'Shop drawing and engineering drawing match sink model',
        itemType: 'PASS_FAIL',
        order: 4,
        isRequired: true,
        notesPrompt: 'Verify shop drawing and engineering drawing match with sink model'
      },
      {
        section: 'Project Verification',
        checklistItem: 'Checklist filled out by tech (all boxes marked, serial numbers written)',
        itemType: 'PASS_FAIL',
        order: 5,
        isRequired: true,
        notesPrompt: 'Verify production checklist has been completed by technician'
      },
      {
        section: 'Project Verification',
        checklistItem: 'No sharp edges, sink is clean (no shavings from drilling)',
        itemType: 'PASS_FAIL',
        order: 6,
        isRequired: true,
        notesPrompt: 'Check for sharp edges and cleanliness on sink'
      },
      {
        section: 'Project Verification',
        checklistItem: 'Testing completed by production team',
        itemType: 'PASS_FAIL',
        order: 7,
        isRequired: true,
        notesPrompt: 'Verify testing has been completed by production team'
      },
      {
        section: 'Project Verification',
        checklistItem: 'Sink build label applied on right side of skirt (bottom-left) and on back',
        itemType: 'PASS_FAIL',
        order: 8,
        isRequired: true,
        notesPrompt: 'Apply sink build label on right side of the skirt (bottom-left) and on the back'
      },
      
      // Section B - Sink General Check
      {
        section: 'Sink General Check',
        checklistItem: 'LED Light installed in bracket with correct hardware, swivels and stays in place',
        itemType: 'PASS_FAIL',
        order: 9,
        isRequired: false,
        applicabilityCondition: 'pegboard_selected',
        notesPrompt: 'Verify LED light is properly installed and functional (N/A if no pegboard)'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Touchscreen per E-Sink Basin: Packaged or Mounted',
        itemType: 'SINGLE_SELECT',
        options: ['Packaged', 'Mounted', 'N/A'],
        order: 10,
        isRequired: false,
        applicabilityCondition: 'e_sink_basins_present',
        notesPrompt: 'Verify touchscreen status for E-Sink basins'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Torvan logo mounted on left side',
        itemType: 'PASS_FAIL',
        order: 11,
        isRequired: true,
        notesPrompt: 'Verify Torvan logo is mounted onto left side'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'All sink faucets mounted according to engineering drawing or packed',
        itemType: 'PASS_FAIL',
        order: 12,
        isRequired: true,
        notesPrompt: 'Verify all sink faucets are mounted according to engineering drawing (or packed if not mounted)'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Drain button mounted per E-Drain Basin',
        itemType: 'PASS_FAIL',
        order: 13,
        isRequired: false,
        applicabilityCondition: 'e_drain_basins_present',
        notesPrompt: 'Verify drain button mounted per E-Drain Basin (N/A if no E-Drain basins)'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Light button mounted (per sink)',
        itemType: 'PASS_FAIL',
        order: 14,
        isRequired: false,
        applicabilityCondition: 'e_drain_basins_present',
        notesPrompt: 'Verify light button mounted per E-Drain sink (N/A if no E-Drain basins)'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Emergency button mounted per E-Sink Basin',
        itemType: 'PASS_FAIL',
        order: 15,
        isRequired: false,
        applicabilityCondition: 'e_sink_basins_present',
        notesPrompt: 'Verify emergency button mounted per E-Sink Basin (N/A if no E-Sink basins)'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Temperature sensor mounted per E-Sink Basin',
        itemType: 'PASS_FAIL',
        order: 16,
        isRequired: false,
        applicabilityCondition: 'e_sink_basins_present',
        notesPrompt: 'Verify temperature sensor mounted per E-Sink Basin (N/A if no E-Sink basins)'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Casters are OK',
        itemType: 'PASS_FAIL',
        order: 17,
        isRequired: true,
        notesPrompt: 'Check casters are functioning properly'
      },
      {
        section: 'Sink General Check',
        checklistItem: 'Height adjustable buttons are mounted',
        itemType: 'PASS_FAIL',
        order: 18,
        isRequired: true,
        notesPrompt: 'Check height adjustable buttons are mounted'
      }
    ]

    // Basin-specific checks for Final Quality (C, D, E sections)
    for (let basinNum = 1; basinNum <= 3; basinNum++) {
      const basinQualityItems = [
        {
          section: `Basin ${basinNum} Quality Check`,
          checklistItem: 'Basin is clean of shavings, metal, dirt etc.',
          itemType: 'PASS_FAIL',
          order: 20 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} is clean of shavings, metal, dirt etc.`
        },
        {
          section: `Basin ${basinNum} Quality Check`,
          checklistItem: 'Bottom fill hole connection',
          itemType: 'SINGLE_SELECT',
          options: ['E-DRAIN: Bottom fill mixing valve', 'E-SINK: Valve plate', 'N/A'],
          order: 21 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} bottom fill hole connection type`
        },
        {
          section: `Basin ${basinNum} Quality Check`,
          checklistItem: 'Basin Light included and Basin Light Button mounted on backsplash',
          itemType: 'PASS_FAIL',
          order: 22 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_light_ordered`,
          notesPrompt: `Verify Basin ${basinNum} light and button (N/A if not ordered)`
        },
        {
          section: `Basin ${basinNum} Quality Check`,
          checklistItem: 'Overflow sensor installed',
          itemType: 'PASS_FAIL',
          order: 23 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} overflow sensor installed`
        },
        {
          section: `Basin ${basinNum} Quality Check`,
          checklistItem: 'Basin level etched on back of basin (60L vs 80L per drawing)',
          itemType: 'PASS_FAIL',
          order: 24 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_exists`,
          notesPrompt: `Verify Basin ${basinNum} level etching is correct per drawing`
        },
        {
          section: `Basin ${basinNum} Quality Check`,
          checklistItem: 'Dosing port mounted (E-Sink only)',
          itemType: 'PASS_FAIL',
          order: 25 + (basinNum - 1) * 10,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Verify Basin ${basinNum} dosing port mounted (E-Sink only)`
        }
      ]
      finalQualityItems.push(...basinQualityItems)
    }

    // Section F - Final Packaging Check
    const finalPackagingItems = [
      {
        section: 'Final Packaging',
        checklistItem: 'Electronic solenoid(s) are bubble wrapped and packed',
        itemType: 'PASS_FAIL',
        order: 60,
        isRequired: true,
        notesPrompt: 'Verify electronic solenoids are properly packed'
      },
      {
        section: 'Final Packaging',
        checklistItem: '1x Sink strainer per basin included (lasered with Torvan Medical logo)',
        itemType: 'PASS_FAIL',
        order: 61,
        isRequired: true,
        notesPrompt: 'Verify sink strainers are included and properly lasered'
      },
      {
        section: 'Final Packaging',
        checklistItem: 'Ø1.5 Flex Hose (4ft) per sink drain + 2x Hose Clamps',
        itemType: 'PASS_FAIL',
        order: 62,
        isRequired: true,
        notesPrompt: 'Verify flex hose and clamps per drain'
      },
      {
        section: 'Final Packaging',
        checklistItem: '1x Drain assembly per basin included',
        itemType: 'PASS_FAIL',
        order: 63,
        isRequired: true,
        notesPrompt: 'Verify drain assemblies per basin'
      },
      {
        section: 'Final Packaging',
        checklistItem: 'Manuals included - Site prep & Install and Operations',
        itemType: 'PASS_FAIL',
        order: 64,
        isRequired: true,
        notesPrompt: 'Verify all required manuals are included'
      },
      {
        section: 'Final Packaging',
        checklistItem: 'E-Sink Automation Manual included',
        itemType: 'PASS_FAIL',
        order: 65,
        isRequired: false,
        applicabilityCondition: 'e_sink_basins_present',
        notesPrompt: 'Verify E-Sink automation manual included (N/A if no E-Sink basins)'
      },
      {
        section: 'Final Packaging',
        checklistItem: 'Temperature sensor, mount and hardware included per E-drain basin',
        itemType: 'PASS_FAIL',
        order: 66,
        isRequired: false,
        applicabilityCondition: 'e_drain_basins_present',
        notesPrompt: 'Verify temperature sensor components per E-drain basin (N/A if no E-drain basins)'
      },
      {
        section: 'Final Packaging',
        checklistItem: 'Anti-fatigue mat per sink included',
        itemType: 'PASS_FAIL',
        order: 67,
        isRequired: true,
        notesPrompt: 'Verify anti-fatigue mat is included per sink'
      }
    ]
    finalQualityItems.push(...finalPackagingItems)

    // Create final quality template items
    for (const item of finalQualityItems) {
      await prisma.qcFormTemplateItem.create({
        data: {
          templateId: finalQualityTemplate.id,
          ...item
        }
      })
    }

    console.log('✅ Created Final Quality Check template with', finalQualityItems.length, 'items')

    // 6. END-OF-LINE TESTING (CLT.T2.001.V01)
    const eolTestingTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'End-of-Line Testing',
        version: '1.0',
        description: 'End-of-line testing procedures based on CLT.T2.001.V01',
        isActive: true,
        appliesToProductFamily: 'T2 Sink'
      }
    })

    const eolTestingItems = [
      // General Information
      {
        section: 'Test Information',
        checklistItem: 'Tester Name',
        itemType: 'TEXT_INPUT',
        order: 1,
        isRequired: true,
        notesPrompt: 'Enter the name of the person conducting the test'
      },
      {
        section: 'Test Information',
        checklistItem: 'Test Date',
        itemType: 'DATE_INPUT',
        order: 2,
        isRequired: true,
        notesPrompt: 'Enter the date of testing'
      },
      {
        section: 'Test Information',
        checklistItem: 'Sink Build Number',
        itemType: 'TEXT_INPUT',
        order: 3,
        isRequired: true,
        notesPrompt: 'Enter the sink build number being tested'
      },
      
      // General Sink Tests
      {
        section: 'General Sink Test',
        checklistItem: 'Test 1-A: Plug sink main power cord - E-Drain buttons lit, E-Sink GUI displayed',
        itemType: 'PASS_FAIL',
        order: 4,
        isRequired: true,
        notesPrompt: 'Verify power connection results in proper display/lighting'
      },
      {
        section: 'General Sink Test',
        checklistItem: 'Test 2-A: Height adjustment button raises sink',
        itemType: 'PASS_FAIL',
        order: 5,
        isRequired: true,
        notesPrompt: 'Verify sink height increases when pressing up button'
      },
      {
        section: 'General Sink Test',
        checklistItem: 'Test 2-B: Height adjustment button lowers sink',
        itemType: 'PASS_FAIL',
        order: 6,
        isRequired: true,
        notesPrompt: 'Verify sink height decreases when pressing down button'
      }
    ]

    // E-Drain Test Procedures (for each basin)
    for (let basinNum = 1; basinNum <= 3; basinNum++) {
      const eDrainTestItems = [
        {
          section: `E-Drain Basin ${basinNum} Testing`,
          checklistItem: 'Test 1-A: Open bottom fill faucet - Water level rises',
          itemType: 'PASS_FAIL',
          order: 10 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Test Basin ${basinNum} bottom fill functionality`
        },
        {
          section: `E-Drain Basin ${basinNum} Testing`,
          checklistItem: 'Test 1-B: Press E-Drain Button - Water drains until timer ends',
          itemType: 'PASS_FAIL',
          order: 11 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Test Basin ${basinNum} drain button functionality`
        },
        {
          section: `E-Drain Basin ${basinNum} Testing`,
          checklistItem: 'Test 2-A: Fill until overflow sensor activated - Drain opens',
          itemType: 'PASS_FAIL',
          order: 12 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Test Basin ${basinNum} overflow sensor activation`
        },
        {
          section: `E-Drain Basin ${basinNum} Testing`,
          checklistItem: 'Test 2-B: Wait 10-15 seconds - Overflow sensor deactivates, drain closes',
          itemType: 'PASS_FAIL',
          order: 13 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Test Basin ${basinNum} overflow sensor deactivation`
        },
        {
          section: `E-Drain Basin ${basinNum} Testing`,
          checklistItem: 'Test 2-C: Start filling again - Water level increases (drain closed)',
          itemType: 'PASS_FAIL',
          order: 14 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain`,
          notesPrompt: `Test Basin ${basinNum} drain closure functionality`
        },
        {
          section: `E-Drain Basin ${basinNum} Testing`,
          checklistItem: 'Test 3-A: Press Overhead LED Light Button - Cycles through modes, turns off',
          itemType: 'PASS_FAIL',
          order: 15 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain_and_overhead_light`,
          notesPrompt: `Test Basin ${basinNum} overhead LED light cycling (N/A if no overhead light)`
        },
        {
          section: `E-Drain Basin ${basinNum} Testing`,
          checklistItem: 'Test 3-B: Press Basin Light - Light turns on/off',
          itemType: 'PASS_FAIL',
          order: 16 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_drain_and_basin_light`,
          notesPrompt: `Test Basin ${basinNum} basin light functionality (N/A if no basin light)`
        }
      ]
      eolTestingItems.push(...eDrainTestItems)

      // E-Sink Test Procedures (for each basin)
      const eSinkTestItems = [
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Serial Numbers - Touchscreen SN [T2-TS7]',
          itemType: 'TEXT_INPUT',
          order: 50 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Record Basin ${basinNum} touchscreen serial number`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Touchscreen Software Version',
          itemType: 'TEXT_INPUT',
          order: 51 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Record Basin ${basinNum} touchscreen software version`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 1-A: Calibrate sink and basin temperature - Within 2°C',
          itemType: 'PASS_FAIL',
          order: 52 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Test Basin ${basinNum} temperature calibration`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 1-B: Calibrate flow meter - Water level matches etched marking',
          itemType: 'PASS_FAIL',
          order: 53 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Test Basin ${basinNum} flow meter calibration`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 2-A: Fill at 20°C - No leaks in valve plate or bottom fill',
          itemType: 'PASS_FAIL',
          order: 54 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Test Basin ${basinNum} filling at 20°C without leaks`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 2-B: Fill at 40°C - Bottom fill temperature within 4°C of target',
          itemType: 'PASS_FAIL',
          order: 55 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Test Basin ${basinNum} bottom fill temperature accuracy`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 2-C: Basin temperature sensor within 2°C of target (40°C)',
          itemType: 'PASS_FAIL',
          order: 56 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Test Basin ${basinNum} basin temperature sensor accuracy`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 3-A: Fill to overflow sensor - Drain opens, overflow message appears',
          itemType: 'PASS_FAIL',
          order: 57 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Test Basin ${basinNum} overflow protection`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 3-B: Water drops below sensor - Message disappears, drain closes',
          itemType: 'PASS_FAIL',
          order: 58 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink`,
          notesPrompt: `Test Basin ${basinNum} overflow recovery`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 4-A: Press Overhead LED Light Button - Cycles and turns off',
          itemType: 'PASS_FAIL',
          order: 59 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink_and_overhead_light`,
          notesPrompt: `Test Basin ${basinNum} overhead LED functionality (N/A if no overhead light)`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 4-B: Press Basin light button on GUI - Light turns on/off',
          itemType: 'PASS_FAIL',
          order: 60 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink_and_basin_light`,
          notesPrompt: `Test Basin ${basinNum} basin light GUI control (N/A if no basin light)`
        },
        {
          section: `E-Sink Basin ${basinNum} Testing`,
          checklistItem: 'Test 5-A: Press dose button on GUI - Dosing pump starts and completes',
          itemType: 'PASS_FAIL',
          order: 61 + (basinNum - 1) * 20,
          isRequired: false,
          repeatPer: `basin_${basinNum}`,
          applicabilityCondition: `basin_${basinNum}_e_sink_and_dosing_pump`,
          notesPrompt: `Test Basin ${basinNum} dosing pump functionality (N/A if no dosing pump)`
        }
      ]
      eolTestingItems.push(...eSinkTestItems)
    }

    // Create EOL testing template items
    for (const item of eolTestingItems) {
      await prisma.qcFormTemplateItem.create({
        data: {
          templateId: eolTestingTemplate.id,
          ...item
        }
      })
    }

    console.log('✅ Created End-of-Line Testing template with', eolTestingItems.length, 'items')

    console.log('🎉 Successfully seeded comprehensive QC templates!')
    console.log('📊 Summary:')
    console.log(`   • Pre-Production Check: ${preProductionItems.length} items`)
    console.log(`   • Production Check: ${productionItems.length} items`)
    console.log(`   • Basin Production Check: ${basinProductionItems.length} items`)
    console.log(`   • Packaging Verification: ${packagingItems.length} items`)
    console.log(`   • Final Quality Check: ${finalQualityItems.length} items`)
    console.log(`   • End-of-Line Testing: ${eolTestingItems.length} items`)
    console.log(`   • Total: 6 templates, ${preProductionItems.length + productionItems.length + basinProductionItems.length + packagingItems.length + finalQualityItems.length + eolTestingItems.length} checklist items`)

  } catch (error) {
    console.error('❌ Error seeding QC templates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedComprehensiveQCTemplates()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { seedComprehensiveQCTemplates }