const { sequelize } = require('./config/database');
const migration = require('./migrations/create_purchase_rates_table');

async function runMigration() {
  try {
    console.log('🔄 Starting purchase_rates table migration...');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    
    console.log('✅ purchase_rates table created successfully!');
    console.log('📝 Indexes created: idx_purchase_rates_arrival, idx_purchase_rates_created_by, idx_purchase_rates_created_at');
    
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('✅ purchase_rates table already exists');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
