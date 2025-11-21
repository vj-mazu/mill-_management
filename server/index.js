require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const arrivalsRoutes = require('./routes/arrivals');
const recordsRoutes = require('./routes/records');
const locationsRoutes = require('./routes/locations');
const exportRoutes = require('./routes/export');
const ledgerRoutes = require('./routes/ledger');
const outturnsRoutes = require('./routes/outturns');
const byproductsRoutes = require('./routes/byproducts');
const outturnExportRoutes = require('./routes/outturn_export');
const dateExportRoutes = require('./routes/date_export');
const dashboardRoutes = require('./routes/dashboard');
const packagingsRoutes = require('./routes/packagings');
const riceProductionsRoutes = require('./routes/rice-productions');
const { router: purchaseRatesRoutes } = require('./routes/purchase-rates');
const hamaliRatesRoutes = require('./routes/hamali-rates');
const hamaliEntriesRoutes = require('./routes/hamali-entries');
const paddyHamaliRatesRoutes = require('./routes/paddy-hamali-rates');
const paddyHamaliEntriesRoutes = require('./routes/paddy-hamali-entries');
const metricsRoutes = require('./routes/metrics');
const riceStockRoutes = require('./routes/rice-stock');
const yieldRoutes = require('./routes/yield');

const compression = require('compression');
const performanceMonitor = require('./middleware/performanceMonitor');

const app = express();
const PORT = process.env.PORT || 5000;

// Performance monitoring (tracks response times)
app.use(performanceMonitor);

// Performance: Enable gzip compression
app.use(compression({
  level: 6, // Compression level (0-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/arrivals', arrivalsRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/export/pdf/outturn', outturnExportRoutes);
app.use('/api/export/date', dateExportRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/outturns', outturnsRoutes);
app.use('/api/byproducts', byproductsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/packagings', packagingsRoutes);
app.use('/api/rice-productions', riceProductionsRoutes);
app.use('/api/purchase-rates', purchaseRatesRoutes);
app.use('/api/hamali-rates', hamaliRatesRoutes);
app.use('/api/hamali-entries', hamaliEntriesRoutes);
app.use('/api/paddy-hamali-rates', paddyHamaliRatesRoutes);
app.use('/api/paddy-hamali-entries', paddyHamaliEntriesRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/rice-stock', riceStockRoutes);
app.use('/api/yield', yieldRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();

    // Check if tables exist
    const tables = await sequelize.getQueryInterface().showAllTables();

    res.json({
      status: 'OK',
      message: 'Mother India Stock Management Server is running',
      database: 'Connected',
      tables: tables.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Check if tables exist, if not create them
    try {
      const tables = await sequelize.getQueryInterface().showAllTables();

      if (tables.length === 0) {
        console.log('🔄 Empty database detected. Creating initial schema...');
        // Force sync to create all tables on fresh database
        await sequelize.sync({ force: false, alter: false });
        console.log('✅ Initial database schema created.');
      } else {
        console.log('✅ Database ready (using migrations for schema management).');
      }
    } catch (syncError) {
      console.log('⚠️ Schema check warning:', syncError.message);
      console.log('✅ Proceeding with migrations...');
    }

    // Run migrations automatically
    try {
      console.log('🔄 Running migrations...');

      // Migration 0: Fix rate type enum (cleanup)
      try {
        const fixRateTypeEnum = require('./migrations/fix_rate_type_enum');
        await fixRateTypeEnum();
      } catch (error) {
        console.log('⚠️ Migration 0 warning:', error.message);
      }

      // Migration 1: Add linked shifting ID
      try {
        const { addLinkedShiftingId } = require('./migrations/add_linked_shifting_id');
        await addLinkedShiftingId();
      } catch (error) {
        console.log('⚠️ Migration 1 warning:', error.message);
      }

      // Migration 2: Create opening balances table
      try {
        const createOpeningBalancesTable = require('./migrations/create_opening_balances_table');
        const queryInterface = sequelize.getQueryInterface();
        await createOpeningBalancesTable.up(queryInterface, sequelize.Sequelize);
      } catch (error) {
        console.log('⚠️ Migration 2 warning:', error.message);
      }

      // Migration 3: Update kunchinittu constraints
      try {
        const updateKunchinintuConstraints = require('./migrations/update_kunchinittu_constraints');
        const queryInterface = sequelize.getQueryInterface();
        await updateKunchinintuConstraints.up(queryInterface, sequelize.Sequelize);
      } catch (error) {
        console.log('⚠️ Migration 3 warning:', error.message);
      }

      // Migration 4: Create balance audit trails table
      try {
        const createBalanceAuditTrailsTable = require('./migrations/create_balance_audit_trails_table');
        const queryInterface = sequelize.getQueryInterface();
        await createBalanceAuditTrailsTable.up(queryInterface, sequelize.Sequelize);
      } catch (error) {
        console.log('⚠️ Migration 4 warning:', error.message);
      }

      // Migration 5: Add performance indexes
      try {
        const addPerformanceIndexes = require('./migrations/add_performance_indexes');
        await addPerformanceIndexes.up();
      } catch (error) {
        console.log('⚠️ Migration 5 warning:', error.message);
      }

      // Migration 6: Add fromOutturnId for purchase from production
      try {
        const addFromOutturnId = require('./migrations/add_from_outturn_id');
        await addFromOutturnId();
      } catch (error) {
        console.log('⚠️ Migration 6 warning:', error.message);
      }

      // Migration 6.5: Create rice production tables
      try {
        const createRiceProductionTables = require('./migrations/create_rice_production_tables');
        await createRiceProductionTables();
      } catch (error) {
        console.log('⚠️ Migration 6.5 warning:', error.message);
      }

      // Migration 7: Update rice production product types
      try {
        const updateRiceProductionProductTypes = require('./migrations/update_rice_production_product_types');
        await updateRiceProductionProductTypes();
      } catch (error) {
        console.log('⚠️ Migration 7 warning:', error.message);
      }

      // Migration 8: Add rice production indexes
      try {
        const addRiceProductionIndexes = require('./migrations/add_rice_production_indexes');
        await addRiceProductionIndexes();
        console.log('✅ Migration 8: Rice production indexes added');
      } catch (error) {
        console.log('⚠️ Migration 8 warning:', error.message);
      }

      // Migration 9: Add unpolished to byproducts
      try {
        const addUnpolishedToByproducts = require('./migrations/add_unpolished_to_byproducts');
        const queryInterface = sequelize.getQueryInterface();
        await addUnpolishedToByproducts.up(queryInterface, sequelize.Sequelize);
      } catch (error) {
        console.log('⚠️ Migration 9 warning:', error.message);
      }

      // Migration 10: Fix net weight
      try {
        const fixNetWeight = require('./migrations/fix_net_weight');
        const queryInterface = sequelize.getQueryInterface();
        await fixNetWeight.up(queryInterface, sequelize.Sequelize);
      } catch (error) {
        console.log('⚠️ Migration 10 warning:', error.message);
      }

      // Migration 11: Create purchase rates table
      try {
        const createPurchaseRatesTable = require('./migrations/create_purchase_rates_table');
        const queryInterface = sequelize.getQueryInterface();
        await createPurchaseRatesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 11: Purchase rates table created');
      } catch (error) {
        console.log('⚠️ Migration 11 warning:', error.message);
      }

      // Migration 12: Add RJ Rice 1 and RJ Rice 2 to byproducts
      try {
        const addRjRiceToByproducts = require('./migrations/add_rj_rice_to_byproducts');
        const queryInterface = sequelize.getQueryInterface();
        await addRjRiceToByproducts.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 12: RJ Rice columns added to byproducts');
      } catch (error) {
        console.log('⚠️ Migration 11 warning:', error.message);
      }

      // Migration 12: Add sute column to purchase rates
      try {
        const addSuteToPurchaseRates = require('./migrations/add_sute_to_purchase_rates');
        const queryInterface = sequelize.getQueryInterface();
        await addSuteToPurchaseRates.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 12: Sute column added to purchase rates');
      } catch (error) {
        console.log('⚠️ Migration 12 warning:', error.message);
      }

      // Migration 13: Create hamali rates table
      try {
        const createHamaliRatesTable = require('./migrations/create_hamali_rates_table');
        const queryInterface = sequelize.getQueryInterface();
        await createHamaliRatesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 13: Hamali rates table created');
      } catch (error) {
        console.log('⚠️ Migration 13 warning:', error.message);
      }

      // Migration 14: Create hamali entries table
      try {
        const createHamaliEntriesTable = require('./migrations/create_hamali_entries_table');
        const queryInterface = sequelize.getQueryInterface();
        await createHamaliEntriesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 14: Hamali entries table created');
      } catch (error) {
        console.log('⚠️ Migration 14 warning:', error.message);
      }

      // Migration 15: Add status to hamali entries
      try {
        const addStatusToHamaliEntries = require('./migrations/add_status_to_hamali_entries');
        const queryInterface = sequelize.getQueryInterface();
        await addStatusToHamaliEntries.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 15: Status added to hamali entries');
      } catch (error) {
        console.log('⚠️ Migration 15 warning:', error.message);
      }

      // Migration 16: Add unique kunchinittu name constraint
      try {
        const addUniqueKunchinintuName = require('./migrations/add_unique_kunchinittu_name');
        const queryInterface = sequelize.getQueryInterface();
        await addUniqueKunchinintuName.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 16: Unique kunchinittu name constraint added');
      } catch (error) {
        console.log('⚠️ Migration 16 warning:', error.message);
      }

      // Migration 17: Add loose movement type
      try {
        const addLooseMovementType = require('./migrations/add_loose_movement_type');
        await addLooseMovementType();
        console.log('✅ Migration 17: Loose movement type added');
      } catch (error) {
        console.log('⚠️ Migration 17 warning:', error.message);
      }

      // Migration 18: Add paddy bags deducted column
      try {
        const addPaddyBagsDeducted = require('./migrations/add_paddy_bags_deducted_column');
        await addPaddyBagsDeducted.up();
        console.log('✅ Migration 18: Paddy bags deducted column added');
      } catch (error) {
        console.log('⚠️ Migration 18 warning:', error.message);
      }

      // Migration 19: Update rate type enum
      try {
        const updateRateTypeEnum = require('./migrations/update_rate_type_enum');
        const queryInterface = sequelize.getQueryInterface();
        await updateRateTypeEnum.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 19: Rate type enum updated');
      } catch (error) {
        console.log('⚠️ Migration 19 warning:', error.message);
      }

      // Migration 20: Drop RAG system tables
      try {
        const dropRagTables = require('./migrations/drop_rag_tables');
        const queryInterface = sequelize.getQueryInterface();
        await dropRagTables.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 20: RAG system tables dropped');
      } catch (error) {
        console.log('⚠️ Migration 20 warning:', error.message);
      }

      // Migration 21: Update for-production to purchase
      try {
        const updateForProductionToPurchase = require('./migrations/update_for_production_to_purchase');
        await updateForProductionToPurchase.up();
        console.log('✅ Migration 21: For-production records updated to purchase');
      } catch (error) {
        console.log('⚠️ Migration 21 warning:', error.message);
      }

      // Migration 22: Add comprehensive performance indexes
      try {
        const addComprehensiveIndexes = require('./migrations/add_comprehensive_indexes');
        await addComprehensiveIndexes.up();
        console.log('✅ Migration 22: Comprehensive performance indexes added');
      } catch (error) {
        console.log('⚠️ Migration 22 warning:', error.message);
      }

      // Migration 23: Create rice stock locations table
      try {
        const createRiceStockLocationsTable = require('./migrations/create_rice_stock_locations_table');
        await createRiceStockLocationsTable.up();
        console.log('✅ Migration 23: Rice stock locations table created');
      } catch (error) {
        console.log('⚠️ Migration 23 warning:', error.message);
      }

      // Migration 24: Update packaging kg to decimal
      try {
        const updatePackagingKgToDecimal = require('./migrations/update_packaging_kg_to_decimal');
        await updatePackagingKgToDecimal.up();
        await addPerformanceIndexes.up();
      } catch (error) {
        console.log('⚠️ Migration 5 warning:', error.message);
      }

      // Migration 6: Add fromOutturnId for purchase from production
      try {
        const addFromOutturnId = require('./migrations/add_from_outturn_id');
        await addFromOutturnId();
      } catch (error) {
        console.log('⚠️ Migration 6 warning:', error.message);
      }

      // Migration 6.5: Create rice production tables
      try {
        const createRiceProductionTables = require('./migrations/create_rice_production_tables');
        await createRiceProductionTables();
      } catch (error) {
        console.log('⚠️ Migration 6.5 warning:', error.message);
      }

      // Migration 7: Update rice production product types
      try {
        const updateRiceProductionProductTypes = require('./migrations/update_rice_production_product_types');
        await updateRiceProductionProductTypes();
      } catch (error) {
        console.log('⚠️ Migration 7 warning:', error.message);
      }

      // Migration 8: Add rice production indexes
      try {
        const addRiceProductionIndexes = require('./migrations/add_rice_production_indexes');
        await addRiceProductionIndexes();
        console.log('✅ Migration 8: Rice production indexes added');
      } catch (error) {
        console.log('⚠️ Migration 8 warning:', error.message);
      }

      // Migration 9: Add unpolished to byproducts
      try {
        const addUnpolishedToByproducts = require('./migrations/add_unpolished_to_byproducts');
        const queryInterface = sequelize.getQueryInterface();
        await addUnpolishedToByproducts.up(queryInterface, sequelize.Sequelize);
      } catch (error) {
        console.log('⚠️ Migration 9 warning:', error.message);
      }

      // Migration 10: Fix net weight
      try {
        const fixNetWeight = require('./migrations/fix_net_weight');
        const queryInterface = sequelize.getQueryInterface();
        await fixNetWeight.up(queryInterface, sequelize.Sequelize);
      } catch (error) {
        console.log('⚠️ Migration 10 warning:', error.message);
      }

      // Migration 11: Create purchase rates table
      try {
        const createPurchaseRatesTable = require('./migrations/create_purchase_rates_table');
        const queryInterface = sequelize.getQueryInterface();
        await createPurchaseRatesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 11: Purchase rates table created');
      } catch (error) {
        console.log('⚠️ Migration 11 warning:', error.message);
      }

      // Migration 12: Add RJ Rice 1 and RJ Rice 2 to byproducts
      try {
        const addRjRiceToByproducts = require('./migrations/add_rj_rice_to_byproducts');
        const queryInterface = sequelize.getQueryInterface();
        await addRjRiceToByproducts.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 12: RJ Rice columns added to byproducts');
      } catch (error) {
        console.log('⚠️ Migration 11 warning:', error.message);
      }

      // Migration 12: Add sute column to purchase rates
      try {
        const addSuteToPurchaseRates = require('./migrations/add_sute_to_purchase_rates');
        const queryInterface = sequelize.getQueryInterface();
        await addSuteToPurchaseRates.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 12: Sute column added to purchase rates');
      } catch (error) {
        console.log('⚠️ Migration 12 warning:', error.message);
      }

      // Migration 13: Create hamali rates table
      try {
        const createHamaliRatesTable = require('./migrations/create_hamali_rates_table');
        const queryInterface = sequelize.getQueryInterface();
        await createHamaliRatesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 13: Hamali rates table created');
      } catch (error) {
        console.log('⚠️ Migration 13 warning:', error.message);
      }

      // Migration 14: Create hamali entries table
      try {
        const createHamaliEntriesTable = require('./migrations/create_hamali_entries_table');
        const queryInterface = sequelize.getQueryInterface();
        await createHamaliEntriesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 14: Hamali entries table created');
      } catch (error) {
        console.log('⚠️ Migration 14 warning:', error.message);
      }

      // Migration 15: Add status to hamali entries
      try {
        const addStatusToHamaliEntries = require('./migrations/add_status_to_hamali_entries');
        const queryInterface = sequelize.getQueryInterface();
        await addStatusToHamaliEntries.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 15: Status added to hamali entries');
      } catch (error) {
        console.log('⚠️ Migration 15 warning:', error.message);
      }

      // Migration 16: Add unique kunchinittu name constraint
      try {
        const addUniqueKunchinintuName = require('./migrations/add_unique_kunchinittu_name');
        const queryInterface = sequelize.getQueryInterface();
        await addUniqueKunchinintuName.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 16: Unique kunchinittu name constraint added');
      } catch (error) {
        console.log('⚠️ Migration 16 warning:', error.message);
      }

      // Migration 17: Add loose movement type
      try {
        const addLooseMovementType = require('./migrations/add_loose_movement_type');
        await addLooseMovementType();
        console.log('✅ Migration 17: Loose movement type added');
      } catch (error) {
        console.log('⚠️ Migration 17 warning:', error.message);
      }

      // Migration 18: Add paddy bags deducted column
      try {
        const addPaddyBagsDeducted = require('./migrations/add_paddy_bags_deducted_column');
        await addPaddyBagsDeducted.up();
        console.log('✅ Migration 18: Paddy bags deducted column added');
      } catch (error) {
        console.log('⚠️ Migration 18 warning:', error.message);
      }

      // Migration 19: Update rate type enum
      try {
        const updateRateTypeEnum = require('./migrations/update_rate_type_enum');
        const queryInterface = sequelize.getQueryInterface();
        await updateRateTypeEnum.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 19: Rate type enum updated');
      } catch (error) {
        console.log('⚠️ Migration 19 warning:', error.message);
      }

      // Migration 20: Drop RAG system tables
      try {
        const dropRagTables = require('./migrations/drop_rag_tables');
        const queryInterface = sequelize.getQueryInterface();
        await dropRagTables.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 20: RAG system tables dropped');
      } catch (error) {
        console.log('⚠️ Migration 20 warning:', error.message);
      }

      // Migration 21: Update for-production to purchase
      try {
        const updateForProductionToPurchase = require('./migrations/update_for_production_to_purchase');
        await updateForProductionToPurchase.up();
        console.log('✅ Migration 21: For-production records updated to purchase');
      } catch (error) {
        console.log('⚠️ Migration 21 warning:', error.message);
      }

      // Migration 22: Add comprehensive performance indexes
      try {
        const addComprehensiveIndexes = require('./migrations/add_comprehensive_indexes');
        await addComprehensiveIndexes.up();
        console.log('✅ Migration 22: Comprehensive performance indexes added');
      } catch (error) {
        console.log('⚠️ Migration 22 warning:', error.message);
      }

      // Migration 23: Create rice stock locations table
      try {
        const createRiceStockLocationsTable = require('./migrations/create_rice_stock_locations_table');
        await createRiceStockLocationsTable.up();
        console.log('✅ Migration 23: Rice stock locations table created');
      } catch (error) {
        console.log('⚠️ Migration 23 warning:', error.message);
      }

      // Migration 24: Update packaging kg to decimal
      try {
        const updatePackagingKgToDecimal = require('./migrations/update_packaging_kg_to_decimal');
        await updatePackagingKgToDecimal.up();
        console.log('✅ Migration 24: Packaging KG converted to decimal');
      } catch (error) {
        console.log('⚠️ Migration 24 warning:', error.message);
      }

      // Migration 25: Add yield percentage to outturns
      try {
        const addYieldPercentageToOutturns = require('./migrations/25_add_yield_percentage_to_outturns');
        await addYieldPercentageToOutturns.up();
        console.log('✅ Migration 25: Yield percentage column added to outturns');
      } catch (error) {
        console.log('⚠️ Migration 25 warning:', error.message);
      }

      // Migration 26: Create paddy hamali rates table
      try {
        const createPaddyHamaliRatesTable = require('./migrations/create_paddy_hamali_rates_table');
        const queryInterface = sequelize.getQueryInterface();
        await createPaddyHamaliRatesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 26: Paddy hamali rates table created with default rates');
      } catch (error) {
        console.log('⚠️ Migration 26 warning:', error.message);
      }

      // Migration 27: Create paddy hamali entries table
      try {
        const createPaddyHamaliEntriesTable = require('./migrations/create_paddy_hamali_entries_table');
        const queryInterface = sequelize.getQueryInterface();
        await createPaddyHamaliEntriesTable.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 27: Paddy hamali entries table created');
      } catch (error) {
        console.log('⚠️ Migration 27 warning:', error.message);
      }

      // Migration 28: Add Sizer Broken to rice_productions
      try {
        const addSizerBrokenToRiceProduction = require('./migrations/add_sizer_broken_to_rice_production');
        await addSizerBrokenToRiceProduction();
        console.log('✅ Migration 28: "Sizer Broken" added to rice_productions productType');
      } catch (error) {
        console.log('⚠️ Migration 28 warning:', error.message);
      }

      // Migration 29: Add base_rate_calculation_method to purchase_rates
      try {
        const addBaseRateCalculationMethod = require('./migrations/add_base_rate_calculation_method');
        await addBaseRateCalculationMethod();
        console.log('✅ Migration 29: base_rate_calculation_method added to purchase_rates');
      } catch (error) {
        console.log('⚠️ Migration 29 warning:', error.message);
      }

      // Migration 30: Add average_rate and last_rate_calculation to kunchinittus
      try {
        const addAverageRateToKunchinittus = require('./migrations/30_add_average_rate_to_kunchinittus');
        const queryInterface = sequelize.getQueryInterface();
        await addAverageRateToKunchinittus.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 30: average_rate and last_rate_calculation added to kunchinittus');
      } catch (error) {
        console.log('⚠️ Migration 30 warning:', error.message);
      }

      // Migration 31: Add Sizer Broken to rice_productions ENUM
      try {
        const addSizerBrokenToRiceProduction = require('./migrations/add_sizer_broken_to_rice_production');
        const queryInterface = sequelize.getQueryInterface();
        await addSizerBrokenToRiceProduction.up(queryInterface, sequelize.Sequelize);
        console.log('✅ Migration 31: Sizer Broken added to rice_productions product types');
      } catch (error) {
        console.log('⚠️ Migration 31 warning:', error.message);
      }

      console.log('✅ Migrations completed.');
    } catch (error) {
      console.log('⚠️ Migrations warning:', error.message);
    }

    // Default warehouses removed - users should create their own warehouses

    // Create default users if they don't exist
    try {
      await require('./seeders/createDefaultUsers')();
    } catch (error) {
      console.log('⚠️ Default users creation warning:', error.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Mother India Stock Management Server running on port ${PORT}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;