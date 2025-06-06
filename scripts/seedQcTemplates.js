const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedQcTemplates() {
  try {
    console.log('Deleting existing QC templates...');
    await prisma.qcFormTemplateItem.deleteMany({});
    await prisma.qcFormTemplate.deleteMany({});

    // 1. PRE-QC TEMPLATE (CLP Section 1 - for QC_PERSON when order is READY_FOR_PRE_QC)
    const preQcTemplate = {
      name: "T2 Sink Pre-QC Checklist",
      version: "1.0", 
      appliesToProductFamily: "MDRD",
      description: "Pre-production quality control checklist based on CLP.T2.001.V01 Section 1",
      isActive: true,
      items: {
        create: [
          // Job Information
          {
            section: "Job Information",
            checklistItem: "Job ID Number",
            itemType: "TEXT_INPUT",
            order: 1,
            isRequired: true
          },
          {
            section: "Job Information", 
            checklistItem: "Number of Basins",
            itemType: "NUMERIC_INPUT",
            order: 2,
            isRequired: true
          },

          // Dimensional Verification
          {
            section: "Dimensional Verification",
            checklistItem: "Check Final Sink Dimensions, basin dimensions, & BOM",
            itemType: "PASS_FAIL",
            order: 3,
            isRequired: true
          },
          {
            section: "Dimensional Verification",
            checklistItem: "Check dimensions of the entire sink, each basin, and any other dimension mentioned on the drawing",
            itemType: "PASS_FAIL",
            order: 4,
            isRequired: true
          },
          {
            section: "Dimensional Verification", 
            checklistItem: "Attach the final approved drawing and paperwork",
            itemType: "PASS_FAIL",
            order: 5,
            isRequired: true
          },
          {
            section: "Dimensional Verification",
            checklistItem: "Pegboard installed – dimensions match drawing",
            itemType: "PASS_FAIL",
            order: 6,
            isRequired: false
          },

          // Location Verification
          {
            section: "Location Verification",
            checklistItem: "Location of sink faucet holes and mounting holes match drawing/customer order requirements",
            itemType: "PASS_FAIL",
            order: 7,
            isRequired: true
          },

          // Feet Type
          {
            section: "Feet Type",
            checklistItem: "Sink has correct feet type",
            itemType: "SINGLE_SELECT",
            options: ["Lock & levelling castors", "Levelling Feet"],
            order: 8,
            isRequired: true
          },

          // Basin 1 Checks
          {
            section: "Basin 1 Checks",
            checklistItem: "Basin 1 - Bottom fill hole",
            itemType: "PASS_FAIL",
            order: 9,
            isRequired: true
          },
          {
            section: "Basin 1 Checks",
            checklistItem: "Basin 1 - Drain Button",
            itemType: "PASS_FAIL",
            order: 10,
            isRequired: true
          },
          {
            section: "Basin 1 Checks",
            checklistItem: "Basin 1 - Basin Light",
            itemType: "PASS_FAIL",
            order: 11,
            isRequired: true
          },
          {
            section: "Basin 1 Checks",
            checklistItem: "Basin 1 - Drain Location",
            itemType: "SINGLE_SELECT",
            options: ["Center", "Other"],
            order: 12,
            isRequired: true
          },
          {
            section: "Basin 1 Checks",
            checklistItem: "Basin 1 - Sink Faucet Location",
            itemType: "SINGLE_SELECT",
            options: ["Center of basin", "Between Basins 1/2"],
            order: 13,
            isRequired: true
          },

          // Basin 2 Checks (Optional)
          {
            section: "Basin 2 Checks", 
            checklistItem: "Basin 2 - Bottom fill hole",
            itemType: "PASS_FAIL",
            order: 14,
            isRequired: false
          },
          {
            section: "Basin 2 Checks",
            checklistItem: "Basin 2 - Drain Button", 
            itemType: "PASS_FAIL",
            order: 15,
            isRequired: false
          },
          {
            section: "Basin 2 Checks",
            checklistItem: "Basin 2 - Basin Light",
            itemType: "PASS_FAIL",
            order: 16,
            isRequired: false
          },
          {
            section: "Basin 2 Checks",
            checklistItem: "Basin 2 - Drain Location",
            itemType: "SINGLE_SELECT",
            options: ["Center", "Other"],
            order: 17,
            isRequired: false
          },
          {
            section: "Basin 2 Checks",
            checklistItem: "Basin 2 - Sink Faucet Location",
            itemType: "SINGLE_SELECT", 
            options: ["Between Basins 1/2", "Between Basins 2/3", "Center"],
            order: 18,
            isRequired: false
          },

          // Basin 3 Checks (Optional)
          {
            section: "Basin 3 Checks",
            checklistItem: "Basin 3 - Bottom fill hole",
            itemType: "PASS_FAIL",
            order: 19,
            isRequired: false
          },
          {
            section: "Basin 3 Checks",
            checklistItem: "Basin 3 - Drain Button",
            itemType: "PASS_FAIL", 
            order: 20,
            isRequired: false
          },
          {
            section: "Basin 3 Checks",
            checklistItem: "Basin 3 - Basin Light",
            itemType: "PASS_FAIL",
            order: 21,
            isRequired: false
          },
          {
            section: "Basin 3 Checks",
            checklistItem: "Basin 3 - Drain Location",
            itemType: "SINGLE_SELECT",
            options: ["Center", "Other"],
            order: 22,
            isRequired: false
          },
          {
            section: "Basin 3 Checks", 
            checklistItem: "Basin 3 - Sink Faucet Location",
            itemType: "SINGLE_SELECT",
            options: ["Between Basins 2/3", "Center"],
            order: 23,
            isRequired: false
          },

          // Sign-off
          {
            section: "Inspector Sign-off",
            checklistItem: "Inspector Initials",
            itemType: "TEXT_INPUT",
            order: 24,
            isRequired: true
          }
        ]
      }
    };

    // 2. PRODUCTION ASSEMBLY TEMPLATE (CLP Sections 2-4 - for ASSEMBLER during production)
    const productionTemplate = {
      name: "T2 Sink Production Assembly",
      version: "1.0",
      appliesToProductFamily: "MDRD",
      description: "Production assembly checklist based on CLP.T2.001.V01 Sections 2-4",
      isActive: true,
      items: {
        create: [
          // Job Information
          {
            section: "Job Information",
            checklistItem: "PO Number",
            itemType: "TEXT_INPUT",
            order: 1,
            isRequired: true
          },
          {
            section: "Job Information",
            checklistItem: "Build Number",
            itemType: "TEXT_INPUT",
            order: 2,
            isRequired: true
          },

          // Sink Production Checks (Section 2)
          {
            section: "Sink Production",
            checklistItem: "Sink Overhead LED Light Bracket is mounted with plastic washers (if there is a Pegboard)",
            itemType: "PASS_FAIL",
            order: 3,
            isRequired: false
          },
          {
            section: "Sink Production",
            checklistItem: "Sink Overhead LED Light button lasered and installed", 
            itemType: "PASS_FAIL",
            order: 4,
            isRequired: false
          },
          {
            section: "Sink Production",
            checklistItem: "Standard Basin Faucets installed",
            itemType: "PASS_FAIL",
            order: 5,
            isRequired: false
          },
          {
            section: "Sink Production",
            checklistItem: "Lifters Control Button Installed",
            itemType: "SINGLE_SELECT",
            options: ["DPF1K (Non-Programmable)", "DP1C (Programmable)", "N/A"],
            order: 6,
            isRequired: true
          },
          {
            section: "Sink Production",
            checklistItem: "Lifter Controller Installed underneath the sink",
            itemType: "PASS_FAIL",
            order: 7,
            isRequired: true
          },
          {
            section: "Sink Production",
            checklistItem: "Torvan Logo attached on left side of sink",
            itemType: "PASS_FAIL",
            order: 8,
            isRequired: false
          },
          {
            section: "Sink Production",
            checklistItem: "Power Bar is installed",
            itemType: "PASS_FAIL",
            order: 9,
            isRequired: true
          },
          {
            section: "Sink Production",
            checklistItem: "Installed necessary control boxes (E-Drain, E-Sink)",
            itemType: "PASS_FAIL",
            order: 10,
            isRequired: false
          },
          {
            section: "Sink Production",
            checklistItem: "All cables are labelled with 'D#' or 'S#'. Overhead Light cables labelled L4 & S4",
            itemType: "PASS_FAIL",
            order: 11,
            isRequired: false
          },
          {
            section: "Sink Production",
            checklistItem: "Sink is clean of metal shavings, and waste",
            itemType: "PASS_FAIL",
            order: 12,
            isRequired: false
          },

          // Extras
          {
            section: "Extras",
            checklistItem: "Air Gun components (BL-4350-01 and BL-5500-07) installed",
            itemType: "PASS_FAIL",
            order: 13,
            isRequired: false
          },
          {
            section: "Extras",
            checklistItem: "Water Gun components (BL-4500-02 and BL-4249) installed",
            itemType: "PASS_FAIL", 
            order: 14,
            isRequired: false
          },
          {
            section: "Extras",
            checklistItem: "DI Faucet installed",
            itemType: "PASS_FAIL",
            order: 15,
            isRequired: false
          },
          {
            section: "Extras",
            checklistItem: "Combo Basin Faucet installed",
            itemType: "PASS_FAIL",
            order: 16,
            isRequired: false
          },

          // E-Drain Basin Production (Section 3)
          {
            section: "E-Drain Basin 1",
            checklistItem: "Installed Bottom-Fill Mixing Valve & Faucet",
            itemType: "PASS_FAIL",
            order: 17,
            isRequired: false
          },
          {
            section: "E-Drain Basin 1",
            checklistItem: "Bottom Fill Assembly installed: Mixing Valve [DER-1899-14-CC] → 1/2\" Male NPT to 3/4BSPP adapter → Check valve → ½\" PEX Adaptor → ½\" PEX Piping → Bottom Fill hole",
            itemType: "PASS_FAIL",
            order: 18,
            isRequired: false
          },
          {
            section: "E-Drain Basin 1",
            checklistItem: "Pipes labelled as Hot Water and Cold Water",
            itemType: "PASS_FAIL",
            order: 19,
            isRequired: false
          },
          {
            section: "E-Drain Basin 1",
            checklistItem: "Overflow sensor installed",
            itemType: "PASS_FAIL",
            order: 20,
            isRequired: false
          },

          // E-Sink Basin Production (Section 3)
          {
            section: "E-Sink Basin 1",
            checklistItem: "Mixing Valve plate is installed",
            itemType: "PASS_FAIL",
            order: 21,
            isRequired: false
          },
          {
            section: "E-Sink Basin 1",
            checklistItem: "Emergency Stop buttons installed",
            itemType: "PASS_FAIL",
            order: 22,
            isRequired: false
          },
          {
            section: "E-Sink Basin 1",
            checklistItem: "E-Sink touchscreen mounted onto Sink",
            itemType: "PASS_FAIL",
            order: 23,
            isRequired: false
          },
          {
            section: "E-Sink Basin 1",
            checklistItem: "E-Sink touchscreen mounted onto Sink and connected to E-Sink Control Box",
            itemType: "PASS_FAIL",
            order: 24,
            isRequired: false
          },
          {
            section: "E-Sink Basin 1",
            checklistItem: "Overflow sensor installed",
            itemType: "PASS_FAIL",
            order: 25,
            isRequired: false
          },
          {
            section: "E-Sink Basin 1",
            checklistItem: "Install dosing port on backsplash",
            itemType: "PASS_FAIL",
            order: 26,
            isRequired: false
          },
          {
            section: "E-Sink Basin 1",
            checklistItem: "Install basin temperature cable gland on backsplash",
            itemType: "PASS_FAIL",
            order: 27,
            isRequired: false
          },

          // Standard Packaging (Section 4)
          {
            section: "Standard Packaging",
            checklistItem: "Anti-Fatigue Mat",
            itemType: "PASS_FAIL",
            order: 28,
            isRequired: true
          },
          {
            section: "Standard Packaging",
            checklistItem: "Sink strainer per sink bowl (lasered with Torvan Medical logo)",
            itemType: "PASS_FAIL",
            order: 29,
            isRequired: true
          },
          {
            section: "Standard Packaging",
            checklistItem: "Ø1.5 Flex Hose (4ft) per sink drain + 2x Hose Clamps",
            itemType: "PASS_FAIL",
            order: 30,
            isRequired: true
          },
          {
            section: "Standard Packaging",
            checklistItem: "1x Temp. Sensor packed per E-Drain basin",
            itemType: "PASS_FAIL",
            order: 31,
            isRequired: false
          },
          {
            section: "Standard Packaging",
            checklistItem: "1x Electronic Drain Solenoid per Basin (Wired, tested and labelled)",
            itemType: "PASS_FAIL",
            order: 32,
            isRequired: true
          },
          {
            section: "Standard Packaging",
            checklistItem: "1x Drain assembly per basin",
            itemType: "PASS_FAIL",
            order: 33,
            isRequired: true
          },
          {
            section: "Standard Packaging",
            checklistItem: "1x shelf for dosing pump, 1x Tubeset per dosing pump",
            itemType: "PASS_FAIL",
            order: 34,
            isRequired: false
          },
          {
            section: "Standard Packaging",
            checklistItem: "Drain gasket per basin",
            itemType: "PASS_FAIL",
            order: 35,
            isRequired: true
          },

          // Kits & Manuals
          {
            section: "Kits & Manuals",
            checklistItem: "Air Gun Kit: 1x 64-20900-00, 1x Gun & Tip Holder Bracket",
            itemType: "PASS_FAIL",
            order: 36,
            isRequired: false
          },
          {
            section: "Kits & Manuals",
            checklistItem: "Water Gun Kit: 1x 64-20900-00, 1x DI Compatible Hose & Water Gun, 1x Gun & Tip Holder Bracket",
            itemType: "PASS_FAIL",
            order: 37,
            isRequired: false
          },
          {
            section: "Kits & Manuals",
            checklistItem: "Pre-Rinse Faucet: 1x B-0133, 1x B-0230-K, 2x PFX146332",
            itemType: "PASS_FAIL",
            order: 38,
            isRequired: false
          },
          {
            section: "Kits & Manuals",
            checklistItem: "Faucet Kit: 1x B-2342, 1x B-0230-K, 2x PFX146332",
            itemType: "PASS_FAIL",
            order: 39,
            isRequired: false
          },
          {
            section: "Kits & Manuals",
            checklistItem: "Install & Operations Manual: IFU.T2.SinkInstUser",
            itemType: "PASS_FAIL",
            order: 40,
            isRequired: true
          },
          {
            section: "Kits & Manuals",
            checklistItem: "Install & Operations Manual French: IFU.T2.SinkInstUserFR",
            itemType: "PASS_FAIL",
            order: 41,
            isRequired: false
          },
          {
            section: "Kits & Manuals",
            checklistItem: "E-Sink Automation Manual French: IFU.T2.ESinkInstUserFR",
            itemType: "PASS_FAIL",
            order: 42,
            isRequired: false
          },

          // Final Sign-off
          {
            section: "Assembler Sign-off",
            checklistItem: "Assembler Name",
            itemType: "TEXT_INPUT",
            order: 43,
            isRequired: true
          },
          {
            section: "Assembler Sign-off",
            checklistItem: "Date Completed",
            itemType: "DATE_INPUT",
            order: 44,
            isRequired: true
          }
        ]
      }
    };

    // 3. FINAL QC TEMPLATE (CLQ document - for QC_PERSON when order is READY_FOR_FINAL_QC)
    const finalQcTemplate = {
      name: "T2 Sink Final QC",
      version: "1.0",
      appliesToProductFamily: "MDRD",
      description: "Final quality control inspection based on CLQ.T2.001.V01",
      isActive: true,
      items: {
        create: [
          // Project Information
          {
            section: "Project Information",
            checklistItem: "Project Name",
            itemType: "TEXT_INPUT",
            order: 1,
            isRequired: true
          },
          {
            section: "Project Information",
            checklistItem: "PO Number",
            itemType: "TEXT_INPUT",
            order: 2,
            isRequired: true
          },
          {
            section: "Project Information",
            checklistItem: "Build Number",
            itemType: "TEXT_INPUT",
            order: 3,
            isRequired: true
          },
          {
            section: "Project Information",
            checklistItem: "Sink Model",
            itemType: "TEXT_INPUT",
            order: 4,
            isRequired: true
          },
          {
            section: "Project Information",
            checklistItem: "First Pass",
            itemType: "SINGLE_SELECT",
            options: ["Yes", "No"],
            order: 5,
            isRequired: true
          },
          {
            section: "Project Information",
            checklistItem: "Hi-Pot Test Completed",
            itemType: "SINGLE_SELECT",
            options: ["Yes", "No"],
            order: 6,
            isRequired: true
          },

          // Project Verification
          {
            section: "Project Verification",
            checklistItem: "Check Project PO and ensure that Model matches with what has been ordered (Size, type)",
            itemType: "PASS_FAIL",
            order: 7,
            isRequired: true
          },
          {
            section: "Project Verification",
            checklistItem: "Verify shop drawing, and engineering drawing (sign off by customer if applicable) match with sink model",
            itemType: "PASS_FAIL",
            order: 8,
            isRequired: true
          },
          {
            section: "Project Verification",
            checklistItem: "Checklist has been filled out by tech (all boxes are marked, serial numbers are written down)",
            itemType: "PASS_FAIL",
            order: 9,
            isRequired: true
          },
          {
            section: "Project Verification",
            checklistItem: "Check for sharp edges, cleanliness on sink (shavings left from drilling etc.)",
            itemType: "PASS_FAIL",
            order: 10,
            isRequired: true
          },
          {
            section: "Project Verification",
            checklistItem: "Verify testing has been completed by production team",
            itemType: "PASS_FAIL",
            order: 11,
            isRequired: true
          },
          {
            section: "Project Verification",
            checklistItem: "Apply sink build label on right side of the skirt (bottom-left) and on the back",
            itemType: "PASS_FAIL",
            order: 12,
            isRequired: true
          },

          // Sink General Check
          {
            section: "Sink General Check",
            checklistItem: "PEGBOARD: LED Light is installed in bracket with correct hardware. Overhead light swivels and stays in set place",
            itemType: "PASS_FAIL",
            order: 13,
            isRequired: false
          },
          {
            section: "Sink General Check",
            checklistItem: "[E-SINK] Touchscreen per E-Sink Basin",
            itemType: "SINGLE_SELECT",
            options: ["Packaged", "Mounted", "N/A"],
            order: 14,
            isRequired: false
          },
          {
            section: "Sink General Check",
            checklistItem: "SINK BACKSPLASH: Torvan logo mounted onto left side",
            itemType: "PASS_FAIL",
            order: 15,
            isRequired: true
          },
          {
            section: "Sink General Check",
            checklistItem: "All sink faucets are mounted according to engineering drawing (or packed if not mounted)",
            itemType: "PASS_FAIL",
            order: 16,
            isRequired: true
          },
          {
            section: "Sink General Check",
            checklistItem: "[E-DRAIN] Drain button mounted per E-Drain Basin",
            itemType: "PASS_FAIL",
            order: 17,
            isRequired: false
          },
          {
            section: "Sink General Check",
            checklistItem: "[E-DRAIN] Light button mounted (per sink)",
            itemType: "PASS_FAIL",
            order: 18,
            isRequired: false
          },
          {
            section: "Sink General Check",
            checklistItem: "[E-SINK] Emergency button mounted",
            itemType: "PASS_FAIL",
            order: 19,
            isRequired: false
          },
          {
            section: "Sink General Check",
            checklistItem: "[E-SINK] Temperature sensor mounted per E-Sink Basin",
            itemType: "PASS_FAIL",
            order: 20,
            isRequired: false
          },
          {
            section: "Sink General Check",
            checklistItem: "Check casters are ok",
            itemType: "PASS_FAIL",
            order: 21,
            isRequired: true
          },
          {
            section: "Sink General Check",
            checklistItem: "Check height adjustable buttons are mounted",
            itemType: "PASS_FAIL",
            order: 22,
            isRequired: true
          },

          // Basin 1 Quality Check
          {
            section: "Basin 1 Quality Check",
            checklistItem: "Basin is clean of shavings, metal, dirt etc.",
            itemType: "PASS_FAIL",
            order: 23,
            isRequired: true
          },
          {
            section: "Basin 1 Quality Check",
            checklistItem: "Bottom fill hole connected to appropriate component",
            itemType: "SINGLE_SELECT",
            options: ["[E-DRAIN] Bottom fill mixing valve", "[E-SINK] Valve plate", "N/A"],
            order: 24,
            isRequired: true
          },
          {
            section: "Basin 1 Quality Check",
            checklistItem: "Basin Light included and Basin Light Button mounted on backsplash",
            itemType: "PASS_FAIL",
            order: 25,
            isRequired: false
          },
          {
            section: "Basin 1 Quality Check",
            checklistItem: "Overflow sensor installed",
            itemType: "PASS_FAIL",
            order: 26,
            isRequired: true
          },
          {
            section: "Basin 1 Quality Check",
            checklistItem: "Basin level etched onto back of basin. Etching level is correct per drawing (60L vs 80L)",
            itemType: "PASS_FAIL",
            order: 27,
            isRequired: true
          },
          {
            section: "Basin 1 Quality Check",
            checklistItem: "[E-SINK] Dosing port mounted",
            itemType: "PASS_FAIL",
            order: 28,
            isRequired: false
          },

          // Basin 2 Quality Check (Optional)
          {
            section: "Basin 2 Quality Check",
            checklistItem: "Basin is clean of shavings, metal, dirt etc.",
            itemType: "PASS_FAIL",
            order: 29,
            isRequired: false
          },
          {
            section: "Basin 2 Quality Check",
            checklistItem: "Bottom fill hole connected to appropriate component",
            itemType: "SINGLE_SELECT",
            options: ["[E-DRAIN] Bottom fill mixing valve", "[E-SINK] Valve plate", "N/A"],
            order: 30,
            isRequired: false
          },
          {
            section: "Basin 2 Quality Check",
            checklistItem: "Basin Light included and Basin Light Button mounted on backsplash",
            itemType: "PASS_FAIL",
            order: 31,
            isRequired: false
          },
          {
            section: "Basin 2 Quality Check",
            checklistItem: "Overflow sensor installed",
            itemType: "PASS_FAIL",
            order: 32,
            isRequired: false
          },
          {
            section: "Basin 2 Quality Check",
            checklistItem: "Basin level etched onto back of basin. Etching level is correct per drawing (60L vs 80L)",
            itemType: "PASS_FAIL",
            order: 33,
            isRequired: false
          },
          {
            section: "Basin 2 Quality Check",
            checklistItem: "[E-SINK] Dosing port mounted",
            itemType: "PASS_FAIL",
            order: 34,
            isRequired: false
          },

          // Basin 3 Quality Check (Optional)  
          {
            section: "Basin 3 Quality Check",
            checklistItem: "Basin is clean of shavings, metal, dirt etc.",
            itemType: "PASS_FAIL",
            order: 35,
            isRequired: false
          },
          {
            section: "Basin 3 Quality Check",
            checklistItem: "Bottom fill hole connected to appropriate component",
            itemType: "SINGLE_SELECT",
            options: ["[E-DRAIN] Bottom fill mixing valve", "[E-SINK] Valve plate", "N/A"],
            order: 36,
            isRequired: false
          },
          {
            section: "Basin 3 Quality Check",
            checklistItem: "Basin Light included and Basin Light Button mounted on backsplash",
            itemType: "PASS_FAIL",
            order: 37,
            isRequired: false
          },
          {
            section: "Basin 3 Quality Check",
            checklistItem: "Overflow sensor installed",
            itemType: "PASS_FAIL",
            order: 38,
            isRequired: false
          },
          {
            section: "Basin 3 Quality Check",
            checklistItem: "Basin level etched onto back of basin. Etching level is correct per drawing (60L vs 80L)",
            itemType: "PASS_FAIL",
            order: 39,
            isRequired: false
          },
          {
            section: "Basin 3 Quality Check",
            checklistItem: "[E-SINK] Dosing port mounted",
            itemType: "PASS_FAIL",
            order: 40,
            isRequired: false
          },

          // Final Packaging Verification
          {
            section: "Final Packaging",
            checklistItem: "Electronic solenoid(s) are bubble wrapped and packed",
            itemType: "PASS_FAIL",
            order: 41,
            isRequired: true
          },
          {
            section: "Final Packaging",
            checklistItem: "1x Sink strainer per basin is included (each lasered with Torvan Medical logo)",
            itemType: "PASS_FAIL",
            order: 42,
            isRequired: true
          },
          {
            section: "Final Packaging",
            checklistItem: "Ø1.5 Flex Hose (4ft) per sink drain + 2x Hose Clamps",
            itemType: "PASS_FAIL",
            order: 43,
            isRequired: true
          },
          {
            section: "Final Packaging",
            checklistItem: "1x Drain assembly per basin included",
            itemType: "PASS_FAIL",
            order: 44,
            isRequired: true
          },
          {
            section: "Final Packaging",
            checklistItem: "Manuals included - [ALL] Site prep & Install and Operations",
            itemType: "PASS_FAIL",
            order: 45,
            isRequired: true
          },
          {
            section: "Final Packaging",
            checklistItem: "Manuals included - [E-SINK] E-Sink Automation",
            itemType: "PASS_FAIL",
            order: 46,
            isRequired: false
          },
          {
            section: "Final Packaging",
            checklistItem: "Temperature sensor, mount and hardware included per E-drain basin",
            itemType: "PASS_FAIL",
            order: 47,
            isRequired: false
          },
          {
            section: "Final Packaging",
            checklistItem: "Anti-fatigue matt per sink is included",
            itemType: "PASS_FAIL",
            order: 48,
            isRequired: true
          },

          // QC Inspector Final Sign-off
          {
            section: "QC Inspector Final Sign-off",
            checklistItem: "QC Inspector Name",
            itemType: "TEXT_INPUT",
            order: 49,
            isRequired: true
          },
          {
            section: "QC Inspector Final Sign-off",
            checklistItem: "QC Inspection Date",
            itemType: "DATE_INPUT",
            order: 50,
            isRequired: true
          }
        ]
      }
    };

    // 4. EOL TESTING TEMPLATE (CLT document - for ASSEMBLER/QC_PERSON during testing phase)
    const eolTestingTemplate = {
      name: "T2 Sink EOL Testing",
      version: "1.0",
      appliesToProductFamily: "MDRD", 
      description: "End-of-line testing procedures based on CLT.T2.001.V01",
      isActive: true,
      items: {
        create: [
          // Test Information
          {
            section: "Test Information",
            checklistItem: "Tester Name",
            itemType: "TEXT_INPUT",
            order: 1,
            isRequired: true
          },
          {
            section: "Test Information",
            checklistItem: "Test Date",
            itemType: "DATE_INPUT",
            order: 2,
            isRequired: true
          },
          {
            section: "Test Information",
            checklistItem: "Sink Build Number",
            itemType: "TEXT_INPUT",
            order: 3,
            isRequired: true
          },

          // General Sink Tests
          {
            section: "General Sink Test",
            checklistItem: "Test 1-A: Plug sinks main power cord into electrical outlet - E-Drain: All buttons are lit and E-Sink: GUI on touchscreen(s) are displayed",
            itemType: "PASS_FAIL",
            order: 4,
            isRequired: true
          },
          {
            section: "General Sink Test",
            checklistItem: "Test 2-A: Press height adjustment button on sink to raise sink - Sink height increases when pressing up",
            itemType: "PASS_FAIL",
            order: 5,
            isRequired: true
          },
          {
            section: "General Sink Test",
            checklistItem: "Test 2-B: Press height adjustment button on sink to lower sink - Sink height decreases when pressing down",
            itemType: "PASS_FAIL",
            order: 6,
            isRequired: true
          },

          // E-Drain Tests Basin 1
          {
            section: "E-Drain Test Basin 1",
            checklistItem: "Test 1-A: Open bottom fill faucet to fill basin below the overflow sensor - Water level will rise",
            itemType: "PASS_FAIL",
            order: 7,
            isRequired: false
          },
          {
            section: "E-Drain Test Basin 1",
            checklistItem: "Test 1-B: Press E-Drain Button to drain water until timer ends - Water level will decrease until basin is empty",
            itemType: "PASS_FAIL",
            order: 8,
            isRequired: false
          },
          {
            section: "E-Drain Test Basin 1",
            checklistItem: "Test 2-A: Fill basin until overflow sensor is activated - Drain will open and water level will decrease",
            itemType: "PASS_FAIL",
            order: 9,
            isRequired: false
          },
          {
            section: "E-Drain Test Basin 1",
            checklistItem: "Test 2-B: Wait for 10 – 15 seconds for overflow sensor to de-activate - Drain will close",
            itemType: "PASS_FAIL",
            order: 10,
            isRequired: false
          },
          {
            section: "E-Drain Test Basin 1",
            checklistItem: "Test 2-C: Start filling basin again to ensure drain is closed - Water level will increase again",
            itemType: "PASS_FAIL",
            order: 11,
            isRequired: false
          },
          {
            section: "E-Drain Test Basin 1",
            checklistItem: "Test 3-A: Press Overhead LED Light Button to cycle through modes and then turn LED light off - LED light will cycle through brightness and then turn off",
            itemType: "PASS_FAIL",
            order: 12,
            isRequired: false
          },
          {
            section: "E-Drain Test Basin 1",
            checklistItem: "Test 3-B: Press Basin Light to turn light on/off - Basin light will turn on/off",
            itemType: "PASS_FAIL",
            order: 13,
            isRequired: false
          },

          // E-Sink Tests Basin 1
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Touchscreen SN [T2-TS7]",
            itemType: "TEXT_INPUT",
            order: 14,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Touchscreen Software Version",
            itemType: "TEXT_INPUT",
            order: 15,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Valve Plate SN [T2-VALVE-PLATE]",
            itemType: "TEXT_INPUT",
            order: 16,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Control Box SN",
            itemType: "TEXT_INPUT",
            order: 17,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Dosing Pump SN",
            itemType: "TEXT_INPUT",
            order: 18,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 1-A: Calibrate sink and basin temperature by following the Temperature Calibration Procedure - Water temperature is calibrated to the calibrated thermometer and reading within 2C",
            itemType: "PASS_FAIL",
            order: 19,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 1-B: Calibrate flow meter by following Flow Meter Calibration Procedure - Flow meter is now calibrated, water level should match etched marking on sink basin once filling is complete",
            itemType: "PASS_FAIL",
            order: 20,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 2-A: Fill: Set mixing temp to 20 deg C. Push Fill button - Water will begin flowing. Verify there are no leaks in the valve plate or bottom fill assembly",
            itemType: "PASS_FAIL",
            order: 21,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 2-B: With calibrated thermometer, insert probe into bottom-fill faucet location - Drain valve closes when mixing temperature is reached. Calibrated thermometer shows water flowing through bottom fill within 4 deg C of target mixing (40C) temperature",
            itemType: "PASS_FAIL",
            order: 22,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 2-C: With calibrated thermometer, insert probe into basin alongside the basin's temperature sensor - Calibrated thermometer shows water flowing through bottom fill within 2 deg C of target mixing (40C) temperature",
            itemType: "PASS_FAIL",
            order: 23,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 3-A: Fill sink basin to the level of the overflow sensor - E-Sink Basin: Drain will open and overflow message will appear on screen",
            itemType: "PASS_FAIL",
            order: 24,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 3-B: Wait for water level to drop. Wait 5 seconds after water is below the overflow sensor - Overflow message will disappear off the screen. Drain will close and water will continue filling",
            itemType: "PASS_FAIL",
            order: 25,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 4-A: Press Overhead LED Light Button to cycle through modes and then turn LED light off - LED light will cycle through brightness and then turn off",
            itemType: "PASS_FAIL",
            order: 26,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 4-B: Press Basin light button on GUI to turn basin light on/off - Basin light will turn on/off",
            itemType: "PASS_FAIL",
            order: 27,
            isRequired: false
          },
          {
            section: "E-Sink Test Basin 1",
            checklistItem: "Test 5-A: Press the dose button on the GUI - Dosing Pump starts spinning. Completes on its own after a short time",
            itemType: "PASS_FAIL",
            order: 28,
            isRequired: false
          },

          // Final Testing Sign-off
          {
            section: "Testing Sign-off",
            checklistItem: "All tests completed successfully",
            itemType: "PASS_FAIL",
            order: 29,
            isRequired: true
          },
          {
            section: "Testing Sign-off",
            checklistItem: "Tester Signature/Initials",
            itemType: "TEXT_INPUT",
            order: 30,
            isRequired: true
          },
          {
            section: "Testing Sign-off",
            checklistItem: "Testing Completion Date",
            itemType: "DATE_INPUT",
            order: 31,
            isRequired: true
          }
        ]
      }
    };

    // Create all templates
    console.log('Creating T2 Sink Pre-QC Checklist...');
    const createdPreQc = await prisma.qcFormTemplate.create({
      data: preQcTemplate,
      include: { items: true }
    });
    console.log(`✅ Created: ${createdPreQc.name} (${createdPreQc.items.length} items)`);

    console.log('Creating T2 Sink Production Assembly...');
    const createdProduction = await prisma.qcFormTemplate.create({
      data: productionTemplate,
      include: { items: true }
    });
    console.log(`✅ Created: ${createdProduction.name} (${createdProduction.items.length} items)`);

    console.log('Creating T2 Sink Final QC...');
    const createdFinalQc = await prisma.qcFormTemplate.create({
      data: finalQcTemplate,
      include: { items: true }
    });
    console.log(`✅ Created: ${createdFinalQc.name} (${createdFinalQc.items.length} items)`);

    console.log('Creating T2 Sink EOL Testing...');
    const createdEolTesting = await prisma.qcFormTemplate.create({
      data: eolTestingTemplate,
      include: { items: true }
    });
    console.log(`✅ Created: ${createdEolTesting.name} (${createdEolTesting.items.length} items)`);

    console.log('\n🎉 All QC Templates seeded successfully!');
    console.log(`\nSummary:`);
    console.log(`- Pre-QC Checklist: ${createdPreQc.items.length} items`);
    console.log(`- Production Assembly: ${createdProduction.items.length} items`);
    console.log(`- Final QC: ${createdFinalQc.items.length} items`);
    console.log(`- EOL Testing: ${createdEolTesting.items.length} items`);
    console.log(`Total: ${createdPreQc.items.length + createdProduction.items.length + createdFinalQc.items.length + createdEolTesting.items.length} checklist items created`);

  } catch (error) {
    console.error('❌ Error seeding QC templates:', error);
    throw error;
  } finally {
    // Don't disconnect here when called from main seed script
    if (require.main === module) {
      await prisma.$disconnect();
    }
  }
}

// Run the seed function
if (require.main === module) {
  seedQcTemplates()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedQcTemplates };