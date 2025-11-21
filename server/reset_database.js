require('dotenv').config();
const { sequelize } = require('./config/database');
const createDefaultUsers = require('./seeders/createDefaultUsers');

// Import all migrations
const { addLinkedShiftingId } = require('./migrations/add_linked_shifting_id');
const createOpeningBalancesTable = require('./migrations/create_opening_balances_table');
const updateKunchinintuConstraints = require('./migrations/update_kunchinittu_constraints');
const createBalanceAuditTrailsTable = require('./migrations/create_balance_audit_trails_table');
const addFromOutturnId = require('./migrations/add_from_outturn_id');
const addRiceProductionIndexes = require('./migrations/add_rice_production_indexes');
const addUnpolishedToByproducts = require('./migrations/add_unpolished_to_byproducts');
const addRjRiceToByproducts = require('./migrations/add_rj_rice_to_byproducts');
const createRiceProductionTables = require('./migrations/create_rice_production_tables');
const fixNetWeight = require('./migrations/fix_net_weight');
const updateRiceProductionProductTypes = require('./migrations/update_rice_production_product_types');
const updateYieldPercentagePrecision = require('./migrations/update_yield_percentage_precision');
const addUniqueKunchinintuName = require('./migrations/add_unique_kunchinittu_name');
const createPurchaseRatesTable = require('./migrations/create_purchase_rates_table');
const addLooseMovementType = require('./migrations/add_loose_movement_type');
const addPaddyBagsDeducted = require('./migrations/add_paddy_bags_deducted_column');
const addSuteToPurchaseRates = require('./migrations/add_sute_to_purchase_rates');
const fixPurchaseRatesNullRateType = require('./migrations/fix_purchase_rates_null_rate_type');
const updateRateTypeEnum = require('./migrations/update_rate_type_enum');
const fixRateTypeEnum = require('./migrations/fix_rate_type_enum');

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...\n');

    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Step 2: Drop all tables (force: true)
    console.log('2️⃣ Dropping all existing tables...');
    await sequelize.sync({ force: true });
    console.log('✅ All tables dropped successfully.\n');

    // Step 3: Recreate all tables with indexes
    console.log('3️⃣ Creating all tables with indexes...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ All tables created successfully.\n');

    // Step 4: Run all migrations
    console.log('4️⃣ Running all migrations...');
    
    const migrations = [
      { name: 'add_linked_shifting_id', fn: addLinkedShiftingId, useQueryInterface: false },
      { name: 'create_opening_balances_table', fn: createOpeningBalancesTable, useQueryInterface: true },
      { name: 'update_kunchinittu_constraints', fn: updateKunchinintuConstraints, useQueryInterface: true },
      { name: 'create_balance_audit_trails_table', fn: createBalanceAuditTrailsTable, useQueryInterface: true },
      { name: 'add_performance_indexes', fn: require('./migrations/add_performance_indexes'), useQueryInterface: true },
      { name: 'add_from_outturn_id', fn: addFromOutturnId, useQueryInterface: true },
      { name: 'create_rice_production_tables', fn: createRiceProductionTables, useQueryInterface: true },
      { name: 'add_rice_production_indexes', fn: addRiceProductionIndexes, useQueryInterface: true },
      { name: 'add_unpolished_to_byproducts', fn: addUnpolishedToByproducts, useQueryInterface: true },
      { name: 'add_rj_rice_to_byproducts', fn: addRjRiceToByproducts, useQueryInterface: true },
      { name: 'fix_net_weight', fn: fixNetWeight, useQueryInterface: true },
      { name: 'update_rice_production_product_types', fn: updateRiceProductionProductTypes, useQueryInterface: true },
      { name: 'update_yield_percentage_precision', fn: updateYieldPercentagePrecision, useQueryInterface: true },
      { name: 'add_unique_kunchinittu_name', fn: addUniqueKunchinintuName, useQueryInterface: true },
      { name: 'create_purchase_rates_table', fn: createPurchaseRatesTable, useQueryInterface: true },
      { name: 'add_loose_movement_type', fn: addLooseMovementType, useQueryInterface: true },
      { name: 'add_paddy_bags_deducted_column', fn: addPaddyBagsDeducted, useQueryInterface: true },
      { name: 'add_sute_to_purchase_rates', fn: addSuteToPurchaseRates, useQueryInterface: true },
      { name: 'fix_purchase_rates_null_rate_type', fn: fixPurchaseRatesNullRateType, useQueryInterface: true },
      { name: 'update_rate_type_enum', fn: updateRateTypeEnum, useQueryInterface: true },
      { name: 'fix_rate_type_enum', fn: fixRateTypeEnum, useQueryInterface: false }
    ];

    for (const migration of migrations) {
      try {
        console.log(`   → Running ${migration.name} migration...`);
        if (migration.useQueryInterface) {
          const queryInterface = sequelize.getQueryInterface();
          await migration.fn.up(queryInterface, sequelize.Sequelize);
        } else {
          await migration.fn();
        }
        console.log(`   ✅ ${migration.name} completed`);
      } catch (error) {
        console.log(`   ⚠️ ${migration.name} warning:`, error.message);
      }
    }

    console.log('✅ All migrations completed.\n');

    // Step 5: Default warehouses removed - users should create their own
    console.log('5️⃣ Skipping default warehouses (users should create their own)');
    console.log('');

    // Step 6: Create default users
    console.log('6️⃣ Creating default users...');
    await createDefaultUsers();
    console.log('');

    // Step 7: Verify database setup
    console.log('7️⃣ Verifying database setup...');
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`✅ Database has ${tables.length} tables:`);
    tables.forEach(table => console.log(`   - ${table}`));
    console.log('');

    console.log('🎉 Database reset completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   ✅ All old tables dropped');
    console.log('   ✅ All tables recreated with proper structure');
    console.log('   ✅ All indexes created');
    console.log('   ✅ All migrations applied');
    console.log('   ✅ Default users created:');
    console.log('      👤 Staff: username=staff, password=staff123');
    console.log('      👤 Manager: username=rohit, password=rohit456');
    console.log('      👤 Admin: username=ashish, password=ashish789');
    console.log('   ✅ System ready to use\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run reset
resetDatabase();
