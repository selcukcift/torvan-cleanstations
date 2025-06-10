const { execSync } = require('child_process');
const path = require('path');

async function runSeedScript(scriptName, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 ${description}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    execSync(`node ${path.join(__dirname, scriptName)}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log(`\n✅ ${description} completed successfully!\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ Error during ${description}:`, error.message);
    return false;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          COMPREHENSIVE DATABASE SEEDING SCRIPT              ║
║                                                            ║
║  This will run ALL seeding scripts in proper sequence:     ║
║  1. Core data (parts, assemblies, users, categories)       ║
║  2. QC Templates (4 templates, 150+ checklist items)       ║
║  3. Enhanced features (work instructions, inventory, etc)  ║
║                                                            ║
║  Total estimated time: 2-3 minutes                         ║
╚════════════════════════════════════════════════════════════╝
`);

  console.log('⚠️  WARNING: This will seed data into your database.');
  console.log('   Make sure your database is properly configured and migrated.\n');
  
  // Add a 3-second delay to allow user to cancel if needed
  console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const startTime = Date.now();
  let allSuccess = true;

  // Step 1: Core Data Seeding
  if (!await runSeedScript('seed.js', 'Step 1: Core Data Seeding')) {
    console.error('\n❌ Core data seeding failed. Stopping process.');
    process.exit(1);
  }

  // Step 2: QC Templates Seeding
  if (!await runSeedScript('seedQcTemplates.js', 'Step 2: QC Templates Seeding')) {
    console.error('\n❌ QC templates seeding failed. Continuing with warnings...');
    allSuccess = false;
  }

  // Step 3: Enhanced Models Seeding
  if (!await runSeedScript('seed-enhanced-models.js', 'Step 3: Enhanced Features Seeding')) {
    console.error('\n❌ Enhanced features seeding failed. Continuing with warnings...');
    allSuccess = false;
  }

  // Final summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SEEDING COMPLETE SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total time: ${duration} seconds`);
  
  if (allSuccess) {
    console.log(`
✅ All seeding scripts completed successfully!

Your database now contains:
- 284 parts
- 334 assemblies (including 154 pegboard kits)
- 6 users with different roles
- 4 QC templates with 150+ checklist items
- Work instructions and task management data
- Inventory and tool requirements
- Sample orders and notifications

You can now start the application with:
  npm run dev
`);
  } else {
    console.log(`
⚠️  Seeding completed with some warnings.
   Check the error messages above for details.
   The application may still work but some features might be limited.
`);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error during seeding:', error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('\n❌ Fatal error during seeding:', error);
  process.exit(1);
});