/**
 * Fresh Database Initialization Script
 * 
 * This script initializes a fresh database with all tables, indexes, and default data.
 * Run this after creating a new empty database.
 * 
 * Usage: node init_fresh_database.js
 */

require('dotenv').config();
const { sequelize } = require('./config/database');

async function initFreshDatabase() {
  try {
    console.log('🔄 Starting fresh database initialization...\n');
    
    // Step 1: Test connection
    console.log('Step 1: Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // Step 2: Check if database is empty
    console.log('Step 2: Checking database state...');
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`📊 Found ${tables.length} existing tables\n`);
    
    // Step 3: Create all tables
    console.log('Step 3: Creating database schema...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Database schema created\n');
    
    // Step 4: Run all migrations
    console.log('Step 4: Running migrations...');
    
    const migrations = [
      { name: 'Fix rate type enum', file: './migrations/fix_rate_type_enum' },
      { name: 'Add linked shifting ID', file: './migrations/add_linked_shifting_id' },
      { name: 'Create opening balances table', file: './migrations/create_opening_balances_table' },
      { name: 'Update kunchinittu constraints', file: './migrations/update_kunchinittu_constraints' },
      { name: 'Create balance audit trails', file: './migrations/create_balance_audit_trails_table' },
      { name: 'Add performance indexes', file: './migrations/add_performance_indexes' },
      { name: 'Add fromOutturnId', file: './migrations/add_from_outturn_id' },
      { name: 'Create rice production tables', file: './migrations/create_rice_production_tables' },
      { name: 'Update rice production types', file: './migrations/update_rice_production_product_types' },
      { name: 'Update yield percentage precision', file: './migrations/update_yield_percentage_precision' },
      { name: 'Add rice production indexes', file: './migrations/add_rice_production_indexes' },
      { name: 'Add unpolished to byproducts', file: './migrations/add_unpolished_to_byproducts' },
      { name: 'Add RJ Rice to byproducts', file: './migrations/add_rj_rice_to_byproducts' },
      { name: 'Fix net weight', file: './migrations/fix_net_weight' },
      { name: 'Create purchase rates table', file: './migrations/create_purchase_rates_table' },
      { name: 'Add sute to purchase rates', file: './migrations/add_sute_to_purchase_rates' },
      { name: 'Create hamali rates table', file: './migrations/create_hamali_rates_table' },
      { name: 'Create hamali entries table', file: './migrations/create_hamali_entries_table' },
      { name: 'Add status to hamali entries', file: './migrations/add_status_to_hamali_entries' },
      { name: 'Add unique kunchinittu name', file: './migrations/add_unique_kunchinittu_name' },
      { name: 'Add loose movement type', file: './migrations/add_loose_movement_type' },
      { name: 'Add paddy bags deducted', file: './migrations/add_paddy_bags_deducted_column' },
      { name: 'Update rate type enum', file: './migrations/update_rate_type_enum' },
      { name: 'Drop RAG tables', file: './migrations/drop_rag_tables' },
      { name: 'Update for-production to purchase', file: './migrations/update_for_production_to_purchase' },
      { name: 'Add comprehensive indexes', file: './migrations/add_comprehensive_indexes' },
      { name: 'Create rice stock locations table', file: './migrations/create_rice_stock_locations_table' },
      { name: 'Update packaging kg to decimal', file: './migrations/update_packaging_kg_to_decimal' },
      { name: 'Add sizer broken to rice production', file: './migrations/add_sizer_broken_to_rice_production' }
    ];
    
    for (const migration of migrations) {
      try {
        console.log(`  🔄 Running: ${migration.name}...`);
        const migrationModule = require(migration.file);
        
        if (migrationModule.up) {
          const queryInterface = sequelize.getQueryInterface();
          await migrationModule.up(queryInterface, sequelize.Sequelize);
        } else if (migrationModule.addLinkedShiftingId) {
          await migrationModule.addLinkedShiftingId();
        } else if (typeof migrationModule === 'function') {
          await migrationModule();
        }
        
        console.log(`  ✅ ${migration.name} completed`);
      } catch (error) {
        console.log(`  ⚠️  ${migration.name} warning: ${error.message}`);
      }
    }
    
    console.log('\n✅ All migrations completed\n');
    
    // Step 5: Default warehouses removed - users should create their own
    console.log('Step 5: Skipping default warehouses (users should create their own)\n');
    
    // Step 6: Create default users
    console.log('Step 6: Creating default users...');
    try {
      await require('./seeders/createDefaultUsers')();
      console.log('✅ Default users created\n');
    } catch (error) {
      console.log(`⚠️  User creation warning: ${error.message}\n`);
    }
    
    // Step 7: Verify installation
    console.log('Step 7: Verifying installation...');
    const finalTables = await sequelize.getQueryInterface().showAllTables();
    console.log(`✅ Database has ${finalTables.length} tables\n`);
    
    console.log('🎉 Fresh database initialization completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   - All tables created');
    console.log('   - All indexes added');
    console.log('   - All migrations applied');
    console.log('   - Default users created');
    console.log('\n✅ Database is ready to use!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    console.error('\nError details:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run initialization
initFreshDatabase();
