/**
 * Manual Migration Script: Add Sizer Broken to rice_productions
 * 
 * Run this script to manually add "Sizer Broken" to the database ENUM
 * without restarting the server.
 * 
 * Usage: node run-sizer-broken-migration.js
 */

require('dotenv').config();
const { sequelize } = require('./config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting Sizer Broken migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Run the migration
    const addSizerBrokenToRiceProduction = require('./migrations/add_sizer_broken_to_rice_production');
    const queryInterface = sequelize.getQueryInterface();
    
    await addSizerBrokenToRiceProduction.up(queryInterface, sequelize.Sequelize);
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('You can now use "Sizer Broken" in rice production entries.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runMigration();
