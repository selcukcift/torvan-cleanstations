const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createBasicQCTemplates() {
  try {
    console.log('🔧 Creating basic QC templates...')

    // Check if we already have basic templates
    const existingTemplate = await prisma.qcFormTemplate.findFirst({
      where: { name: 'Final Quality Check' }
    })

    if (existingTemplate) {
      console.log('✅ Basic QC templates already exist')
      return
    }

    // Create basic Final QC template
    const finalQcTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Final Quality Check',
        description: 'Final quality control inspection for completed sinks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: {
          create: [
            {
              section: 'Visual Inspection',
              checklistItem: 'Check overall finish quality',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 1
            },
            {
              section: 'Visual Inspection',
              checklistItem: 'Verify basin alignment',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 2
            },
            {
              section: 'Functional Test',
              checklistItem: 'Test drainage system',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 3
            },
            {
              section: 'Functional Test',
              checklistItem: 'Test faucet operation',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 4
            },
            {
              section: 'Documentation',
              checklistItem: 'Serial number recorded',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 5
            }
          ]
        }
      }
    })

    // Create basic Pre-Production template
    const preQcTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Pre-Production Check',
        description: 'Pre-production quality control checklist',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: {
          create: [
            {
              section: 'Material Inspection',
              checklistItem: 'Check stainless steel grade certification',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 1
            },
            {
              section: 'Material Inspection',
              checklistItem: 'Verify basin dimensions',
              itemType: 'NUMERIC_INPUT',
              isRequired: true,
              order: 2
            },
            {
              section: 'Component Check',
              checklistItem: 'Verify all parts present',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 3
            },
            {
              section: 'Component Check',
              checklistItem: 'Check leg assembly completeness',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 4
            }
          ]
        }
      }
    })

    // Create basic Production Check template
    const productionTemplate = await prisma.qcFormTemplate.create({
      data: {
        name: 'Production Check',
        description: 'In-process production quality checks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: {
          create: [
            {
              section: 'Assembly Quality',
              checklistItem: 'Check weld quality',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 1
            },
            {
              section: 'Assembly Quality',
              checklistItem: 'Verify frame squareness',
              itemType: 'NUMERIC_INPUT',
              isRequired: true,
              order: 2
            },
            {
              section: 'Fit and Finish',
              checklistItem: 'Check surface finish',
              itemType: 'PASS_FAIL',
              isRequired: true,
              order: 3
            }
          ]
        }
      }
    })

    console.log('✅ Created basic QC templates:')
    console.log(`   - Final Quality Check (${finalQcTemplate.id})`)
    console.log(`   - Pre-Production Check (${preQcTemplate.id})`)
    console.log(`   - Production Check (${productionTemplate.id})`)

  } catch (error) {
    console.error('❌ Error creating basic QC templates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createBasicQCTemplates()
    .then(() => {
      console.log('🎉 Basic QC templates created successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Failed to create QC templates:', error)
      process.exit(1)
    })
}

module.exports = { createBasicQCTemplates }