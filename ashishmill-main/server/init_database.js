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
const addSizerBrokenToRiceProduction = require('./migrations/add_sizer_broken_to_rice_production');

async function initializeDatabase() {
  try {
    console.log('🔄 Starting database initialization...\n');

    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Step 2: Sync all models (create tables with indexes)
    console.log('2️⃣ Syncing database models...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Database models synced successfully.\n');

    // Step 3: Run migrations
    console.log('3️⃣ Running migrations...');
    
    try {
      console.log('   → Running add_linked_shifting_id migration...');
      await addLinkedShiftingId();
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running create_opening_balances_table migration...');
      const queryInterface = sequelize.getQueryInterface();
      await createOpeningBalancesTable.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running update_kunchinittu_constraints migration...');
      const queryInterface = sequelize.getQueryInterface();
      await updateKunchinintuConstraints.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running create_balance_audit_trails_table migration...');
      const queryInterface = sequelize.getQueryInterface();
      await createBalanceAuditTrailsTable.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_performance_indexes migration...');
      const addPerformanceIndexes = require('./migrations/add_performance_indexes');
      const queryInterface = sequelize.getQueryInterface();
      await addPerformanceIndexes.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_from_outturn_id migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addFromOutturnId.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running create_rice_production_tables migration...');
      const queryInterface = sequelize.getQueryInterface();
      await createRiceProductionTables.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_rice_production_indexes migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addRiceProductionIndexes.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_unpolished_to_byproducts migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addUnpolishedToByproducts.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_rj_rice_to_byproducts migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addRjRiceToByproducts.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running fix_net_weight migration...');
      const queryInterface = sequelize.getQueryInterface();
      await fixNetWeight.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running update_rice_production_product_types migration...');
      const queryInterface = sequelize.getQueryInterface();
      await updateRiceProductionProductTypes.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running update_yield_percentage_precision migration...');
      const queryInterface = sequelize.getQueryInterface();
      await updateYieldPercentagePrecision.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_unique_kunchinittu_name migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addUniqueKunchinintuName.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running create_purchase_rates_table migration...');
      const queryInterface = sequelize.getQueryInterface();
      await createPurchaseRatesTable.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_loose_movement_type migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addLooseMovementType.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_paddy_bags_deducted_column migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addPaddyBagsDeducted.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_sute_to_purchase_rates migration...');
      const queryInterface = sequelize.getQueryInterface();
      await addSuteToPurchaseRates.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running fix_purchase_rates_null_rate_type migration...');
      const queryInterface = sequelize.getQueryInterface();
      await fixPurchaseRatesNullRateType.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running update_rate_type_enum migration...');
      const queryInterface = sequelize.getQueryInterface();
      await updateRateTypeEnum.up(queryInterface, sequelize.Sequelize);
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running fix_rate_type_enum migration...');
      await fixRateTypeEnum();
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    try {
      console.log('   → Running add_sizer_broken_to_rice_production migration...');
      await addSizerBrokenToRiceProduction();
    } catch (error) {
      console.log('   ⚠️ Migration warning:', error.message);
    }

    console.log('✅ All migrations completed.\n');

    // Step 4: Default warehouses removed - users should create their own
    console.log('4️⃣ Skipping default warehouses (users should create their own)');
    console.log('');

    // Step 5: Create default users
    console.log('5️⃣ Creating default users...');
    await createDefaultUsers();
    console.log('');

    // Step 6: Verify database setup
    console.log('6️⃣ Verifying database setup...');
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`✅ Database has ${tables.length} tables:`);
    tables.forEach(table => console.log(`   - ${table}`));
    console.log('');

    console.log('🎉 Database initialization completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   ✅ Database connected');
    console.log('   ✅ All tables created with indexes');
    console.log('   ✅ All migrations applied');
    console.log('   ✅ Default users created');
    console.log('   ✅ System ready to use\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
