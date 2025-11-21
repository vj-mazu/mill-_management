// Manual script to run the Sizer Broken migration
const addSizerBrokenToRiceProduction = require('./migrations/add_sizer_broken_to_rice_production');

async function runMigration() {
  try {
    console.log('🚀 Running Sizer Broken migration...');
    await addSizerBrokenToRiceProduction();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
