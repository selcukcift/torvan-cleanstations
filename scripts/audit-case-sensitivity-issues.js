#!/usr/bin/env node

/**
 * Audit Case Sensitivity Issues in Assembly References
 * 
 * This script finds case sensitivity mismatches between assembly definitions
 * and their references throughout the codebase.
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 AUDITING CASE SENSITIVITY ISSUES')
console.log('═══════════════════════════════════════════════════════════════')

// Load assemblies and parts
const assembliesPath = path.join(__dirname, '../resources/assemblies.json')
const partsPath = path.join(__dirname, '../resources/parts.json')

if (!fs.existsSync(assembliesPath)) {
  console.error('❌ assemblies.json not found')
  process.exit(1)
}

if (!fs.existsSync(partsPath)) {
  console.error('❌ parts.json not found')
  process.exit(1)
}

const assembliesData = JSON.parse(fs.readFileSync(assembliesPath, 'utf8'))
const partsData = JSON.parse(fs.readFileSync(partsPath, 'utf8'))

const assemblies = assembliesData.assemblies || {}
const parts = partsData.parts || {}

console.log(`📦 Loaded ${Object.keys(assemblies).length} assemblies`)
console.log(`🔧 Loaded ${Object.keys(parts).length} parts`)

// Create lookup maps for case-insensitive comparison
const assemblyLookup = new Map()
const partLookup = new Map()

Object.keys(assemblies).forEach(id => {
  const lowerKey = id.toLowerCase()
  if (assemblyLookup.has(lowerKey)) {
    console.warn(`⚠️  Duplicate assembly (case insensitive): ${id} vs ${assemblyLookup.get(lowerKey)}`)
  }
  assemblyLookup.set(lowerKey, id)
})

Object.keys(parts).forEach(id => {
  const lowerKey = id.toLowerCase()
  if (partLookup.has(lowerKey)) {
    console.warn(`⚠️  Duplicate part (case insensitive): ${id} vs ${partLookup.get(lowerKey)}`)
  }
  partLookup.set(lowerKey, id)
})

// Find case sensitivity issues
const caseSensitivityIssues = []

// Check assembly component references
console.log('\n🔍 CHECKING ASSEMBLY COMPONENT REFERENCES:')
console.log('───────────────────────────────────────────────────────────')

Object.entries(assemblies).forEach(([assemblyId, assembly]) => {
  if (assembly.components && Array.isArray(assembly.components)) {
    assembly.components.forEach((component, index) => {
      const partId = component.part_id
      if (!partId) return
      
      // Check if this part exists with exact case
      const existsExact = parts[partId] || assemblies[partId]
      
      if (!existsExact) {
        // Check if it exists with different case
        const lowerPartId = partId.toLowerCase()
        const correctAssemblyId = assemblyLookup.get(lowerPartId)
        const correctPartId = partLookup.get(lowerPartId)
        
        if (correctAssemblyId && correctAssemblyId !== partId) {
          caseSensitivityIssues.push({
            type: 'assembly_component_reference',
            assembly: assemblyId,
            componentIndex: index,
            referencedId: partId,
            correctId: correctAssemblyId,
            issue: 'case_mismatch'
          })
          console.log(`❌ Assembly "${assemblyId}" component[${index}] references "${partId}" but should be "${correctAssemblyId}"`)
        } else if (correctPartId && correctPartId !== partId) {
          caseSensitivityIssues.push({
            type: 'assembly_component_reference',
            assembly: assemblyId,
            componentIndex: index,
            referencedId: partId,
            correctId: correctPartId,
            issue: 'case_mismatch'
          })
          console.log(`❌ Assembly "${assemblyId}" component[${index}] references "${partId}" but should be "${correctPartId}"`)
        } else {
          caseSensitivityIssues.push({
            type: 'assembly_component_reference',
            assembly: assemblyId,
            componentIndex: index,
            referencedId: partId,
            correctId: null,
            issue: 'not_found'
          })
          console.log(`❌ Assembly "${assemblyId}" component[${index}] references "${partId}" which doesn't exist`)
        }
      }
    })
  }
})

// Specific check for T2-oa-po-shlf-1212 issue
console.log('\n🎯 SPECIFIC CHECK FOR T2-oa-po-shlf-1212:')
console.log('───────────────────────────────────────────────────────────')

const problematicId = 'T2-oa-po-shlf-1212'
const problematicIdLower = problematicId.toLowerCase()

// Check if it exists as assembly
const exactAssemblyMatch = assemblies[problematicId]
const caseInsensitiveAssemblyMatch = assemblyLookup.get(problematicIdLower)

// Check if it exists as part
const exactPartMatch = parts[problematicId]
const caseInsensitivePartMatch = partLookup.get(problematicIdLower)

console.log(`Searching for: "${problematicId}"`)
console.log(`Exact assembly match: ${exactAssemblyMatch ? 'YES' : 'NO'}`)
console.log(`Case-insensitive assembly match: ${caseInsensitiveAssemblyMatch || 'NO'}`)
console.log(`Exact part match: ${exactPartMatch ? 'YES' : 'NO'}`)
console.log(`Case-insensitive part match: ${caseInsensitivePartMatch || 'NO'}`)

if (caseInsensitiveAssemblyMatch && caseInsensitiveAssemblyMatch !== problematicId) {
  console.log(`🎯 FOUND ISSUE: "${problematicId}" should be "${caseInsensitiveAssemblyMatch}"`)
  
  // Check if the correct assembly has components
  const correctAssembly = assemblies[caseInsensitiveAssemblyMatch]
  if (correctAssembly) {
    const hasComponents = correctAssembly.components && correctAssembly.components.length > 0
    console.log(`Assembly "${caseInsensitiveAssemblyMatch}" has components: ${hasComponents ? 'YES' : 'NO'}`)
    if (!hasComponents) {
      console.log(`⚠️  Assembly "${caseInsensitiveAssemblyMatch}" has empty components array`)
    }
  }
}

// Summary
console.log('\n📊 CASE SENSITIVITY ISSUES SUMMARY:')
console.log('───────────────────────────────────────────────────────────')

const caseMismatchIssues = caseSensitivityIssues.filter(issue => issue.issue === 'case_mismatch')
const notFoundIssues = caseSensitivityIssues.filter(issue => issue.issue === 'not_found')

console.log(`Total issues found: ${caseSensitivityIssues.length}`)
console.log(`Case mismatch issues: ${caseMismatchIssues.length}`)
console.log(`Not found issues: ${notFoundIssues.length}`)

// Save detailed report
const reportPath = path.join(__dirname, '../case-sensitivity-audit-report.json')
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalIssues: caseSensitivityIssues.length,
    caseMismatchIssues: caseMismatchIssues.length,
    notFoundIssues: notFoundIssues.length
  },
  specificCheck: {
    searchId: problematicId,
    exactAssemblyMatch: !!exactAssemblyMatch,
    caseInsensitiveAssemblyMatch: caseInsensitiveAssemblyMatch,
    exactPartMatch: !!exactPartMatch,
    caseInsensitivePartMatch: caseInsensitivePartMatch
  },
  issues: caseSensitivityIssues,
  recommendations: []
}

// Add recommendations
if (caseInsensitiveAssemblyMatch && caseInsensitiveAssemblyMatch !== problematicId) {
  report.recommendations.push({
    type: 'fix_case_sensitivity',
    description: `Update all references from "${problematicId}" to "${caseInsensitiveAssemblyMatch}"`,
    priority: 'high'
  })
}

caseMismatchIssues.forEach(issue => {
  report.recommendations.push({
    type: 'fix_case_sensitivity',
    description: `In assembly "${issue.assembly}", update component reference from "${issue.referencedId}" to "${issue.correctId}"`,
    priority: 'high'
  })
})

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

console.log(`\n📄 Detailed report saved: ${reportPath}`)

if (caseSensitivityIssues.length === 0) {
  console.log('\n✅ No case sensitivity issues found!')
} else {
  console.log('\n❌ Case sensitivity issues found. See report for details.')
  process.exit(1)
}