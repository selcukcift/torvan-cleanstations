/**
 * Create pegboard kits without color specification
 * Pattern: T2-ADW-PB-{size}-{type}-KIT
 * 8 sizes × 2 types = 16 new kits
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const sizes = [
  { size: '3436', name: '34X36', covers: '34" - 47"' },
  { size: '4836', name: '48X36', covers: '48" - 59"' },
  { size: '6036', name: '60X36', covers: '60" - 71"' },
  { size: '7236', name: '72X36', covers: '72" - 83"' },
  { size: '8436', name: '84X36', covers: '84" - 95"' },
  { size: '9636', name: '96X36', covers: '96" - 107"' },
  { size: '10836', name: '108X36', covers: '108" - 119"' },
  { size: '12036', name: '120X36', covers: '120" - 130"' }
]

const types = [
  { type: 'PERF', name: 'PERFORATED' },
  { type: 'SOLID', name: 'SOLID' }
]

async function createPegboardSizeKits() {
  console.log('🔧 Creating pegboard size kits without color specification...')
  
  let created = 0
  let skipped = 0
  
  for (const sizeInfo of sizes) {
    for (const typeInfo of types) {
      const kitId = `T2-ADW-PB-${sizeInfo.size}-${typeInfo.type}-KIT`
      const kitName = `${sizeInfo.name} ${typeInfo.name} PEGBOARD KIT (COVERS ${sizeInfo.covers})`
      
      try {
        // Check if kit already exists
        const existing = await prisma.assembly.findUnique({
          where: { assemblyId: kitId }
        })
        
        if (existing) {
          console.log(`⏭️  Kit already exists: ${kitId}`)
          skipped++
          continue
        }
        
        // Create the kit assembly
        const kit = await prisma.assembly.create({
          data: {
            assemblyId: kitId,
            name: kitName,
            type: 'KIT',
            categoryCode: '716',
            subcategoryCode: '716.128',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        
        console.log(`✅ Created kit: ${kitId}`)
        
        // Add components to the kit
        const components = []
        
        // 1. Base pegboard assembly for the size
        const pegboardAssemblyId = `T2-ADW-PB-${sizeInfo.size}`
        components.push({
          parentAssemblyId: kitId,
          childAssemblyId: pegboardAssemblyId,
          quantity: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        // 2. Pegboard open grommet (standard for all kits)
        components.push({
          parentAssemblyId: kitId,
          childPartId: '22MP20026',
          quantity: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        // Create all components at once
        await prisma.assemblyComponent.createMany({
          data: components
        })
        
        console.log(`   📦 Added ${components.length} components to ${kitId}`)
        created++
        
      } catch (error) {
        console.error(`❌ Error creating kit ${kitId}:`, error)
      }
    }
  }
  
  console.log(`\n🎉 Pegboard size kit creation complete!`)
  console.log(`   ✅ Created: ${created} kits`)
  console.log(`   ⏭️  Skipped: ${skipped} kits (already existed)`)
  console.log(`   📦 Total components added: ${created * 2}`)
}

async function main() {
  try {
    await createPegboardSizeKits()
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

module.exports = { createPegboardSizeKits }