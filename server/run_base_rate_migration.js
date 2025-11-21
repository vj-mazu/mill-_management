// Manual script to run the base rate calculation method migration
const addBaseRateCalculationMethod = require('./migrations/add_base_rate_calculation_method');

async function runMigration() {
  try {
    console.log('🚀 Running base rate calculation method migration...');
    await addBaseRateCalculationMethod();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
