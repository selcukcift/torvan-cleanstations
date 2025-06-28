#!/usr/bin/env node

/**
 * Fix Broken Component Links
 * 
 * This script identifies and removes assembly component links that have
 * both childPartId and childAssemblyId as NULL, which cause "Unknown Component"
 * entries in BOMs.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function findBrokenComponentLinks() {
  console.log('🔍 Finding broken component links...\n')
  
  // Find all component links where both childPartId and childAssemblyId are null
  const brokenLinks = await prisma.$queryRaw`
    SELECT 
      ac.id,
      ac."parentAssemblyId",
      ac.quantity,
      a."AssemblyID",
      a.name as assembly_name
    FROM "AssemblyComponent" ac
    JOIN "Assembly" a ON ac."parentAssemblyId" = a."AssemblyID"
    WHERE ac."childPartId" IS NULL 
      AND ac."childAssemblyId" IS NULL
    ORDER BY a."AssemblyID", ac.id
  `
  
  return brokenLinks
}

async function analyzeSpecificAssembly(assemblyId) {
  console.log(`\n📋 Analyzing ${assemblyId}...\n`)
  
  // Get all components for this assembly
  const components = await prisma.$queryRaw`
    SELECT 
      ac.id as component_link_id,
      ac."childPartId",
      ac."childAssemblyId",
      ac.quantity,
      p."PartID" as part_id,
      p.name as part_name,
      ca."AssemblyID" as child_assembly_id,
      ca.name as child_assembly_name
    FROM "AssemblyComponent" ac
    LEFT JOIN "Part" p ON ac."childPartId" = p."PartID"
    LEFT JOIN "Assembly" ca ON ac."childAssemblyId" = ca."AssemblyID"
    WHERE ac."parentAssemblyId" = ${assemblyId}
    ORDER BY ac.id
  `
  
  console.log(`Found ${components.length} component links:`)
  components.forEach((comp, index) => {
    if (comp.childPartId || comp.childAssemblyId) {
      const name = comp.part_name || comp.child_assembly_name || 'Unknown'
      const id = comp.part_id || comp.child_assembly_id || 'N/A'
      console.log(`  ${index + 1}. ✅ ${name} (${id}) - Qty: ${comp.quantity}`)
    } else {
      console.log(`  ${index + 1}. ❌ BROKEN LINK (ID: ${comp.component_link_id}) - No child part or assembly - Qty: ${comp.quantity}`)
    }
  })
  
  return components
}

async function removeBrokenLinks(dryRun = true) {
  const brokenLinks = await findBrokenComponentLinks()
  
  if (brokenLinks.length === 0) {
    console.log('✅ No broken component links found!')
    return
  }
  
  console.log(`❌ Found ${brokenLinks.length} broken component link(s):\n`)
  
  // Group by assembly
  const linksByAssembly = {}
  brokenLinks.forEach(link => {
    if (!linksByAssembly[link.AssemblyID]) {
      linksByAssembly[link.AssemblyID] = []
    }
    linksByAssembly[link.AssemblyID].push(link)
  })
  
  // Display broken links by assembly
  for (const [assemblyId, links] of Object.entries(linksByAssembly)) {
    console.log(`\n${assemblyId}: ${links[0].assembly_name}`)
    links.forEach(link => {
      console.log(`  - Component Link ID: ${link.id} (Qty: ${link.quantity})`)
    })
  }
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes made')
    console.log('To remove these broken links, run with --fix flag')
  } else {
    console.log('\n🗑️  Removing broken component links...')
    
    const idsToDelete = brokenLinks.map(link => link.id)
    
    try {
      const result = await prisma.assemblyComponent.deleteMany({
        where: {
          id: { in: idsToDelete },
          childPartId: null,
          childAssemblyId: null
        }
      })
      
      console.log(`✅ Removed ${result.count} broken component link(s)`)
    } catch (error) {
      console.error('❌ Error removing broken links:', error)
      throw error
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const shouldFix = args.includes('--fix')
  
  console.log('🔧 Broken Component Links Detector & Fixer\n')
  
  try {
    // First analyze the specific assembly mentioned
    console.log('📊 Analyzing T2-OA-PRE-RINSE-FAUCET-KIT (the reported issue)...')
    await analyzeSpecificAssembly('T2-OA-PRE-RINSE-FAUCET-KIT')
    
    // Then find all broken links
    console.log('\n' + '='.repeat(60) + '\n')
    console.log('🔍 Scanning entire database for broken component links...\n')
    
    await removeBrokenLinks(!shouldFix)
    
    if (!shouldFix) {
      console.log('\n💡 To fix these issues, run:')
      console.log('   node scripts/fix-broken-component-links.js --fix')
    } else {
      // Verify the fix
      console.log('\n✅ Verifying fix for T2-OA-PRE-RINSE-FAUCET-KIT...')
      await analyzeSpecificAssembly('T2-OA-PRE-RINSE-FAUCET-KIT')
    }
    
    console.log('\n✨ Done!')
    
  } catch (error) {
    console.error('💥 Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  main()
    .catch(error => {
      console.error('💥 Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { main }