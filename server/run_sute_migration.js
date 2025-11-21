const { sequelize } = require('./config/database');
const migration = require('./migrations/add_sute_to_purchase_rates');

async function runMigration() {
  try {
    console.log('🔄 Starting Sute fields migration...');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('🎉 Migration completed successfully!');
    console.log('📝 Sute and sute_calculation_method fields added to purchase_rates table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
