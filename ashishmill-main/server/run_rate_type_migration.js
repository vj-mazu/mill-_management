const { sequelize } = require('./config/database');

async function runRateTypeMigration() {
  try {
    console.log('🔄 Starting rate type ENUM migration (CDWM -> CDWB)...');
    
    const dialect = sequelize.getDialect();
    console.log(`📊 Database dialect: ${dialect}`);
    
    if (dialect === 'postgres') {
      console.log('🔧 Applying PostgreSQL migration...');
      
      // Check if old type exists
      const [types] = await sequelize.query(`
        SELECT typname FROM pg_type WHERE typname = 'enum_purchase_rates_rate_type';
      `);
      
      if (types.length === 0) {
        console.log('⚠️ ENUM type does not exist yet. Skipping migration.');
        return;
      }
      
      // Rename old type
      await sequelize.query(`
        ALTER TYPE enum_purchase_rates_rate_type RENAME TO enum_purchase_rates_rate_type_old;
      `);
      console.log('✅ Renamed old ENUM type');
      
      // Create new type with CDWB
      await sequelize.query(`
        CREATE TYPE enum_purchase_rates_rate_type AS ENUM('CDL', 'CDWB', 'MDL', 'MDWB');
      `);
      console.log('✅ Created new ENUM type with CDWB');
      
      // Update column to use new type
      await sequelize.query(`
        ALTER TABLE purchase_rates 
        ALTER COLUMN rate_type TYPE enum_purchase_rates_rate_type 
        USING rate_type::text::enum_purchase_rates_rate_type;
      `);
      console.log('✅ Updated column to use new ENUM type');
      
      // Drop old type
      await sequelize.query(`
        DROP TYPE enum_purchase_rates_rate_type_old;
      `);
      console.log('✅ Dropped old ENUM type');
      
    } else {
      console.log('🔧 Applying MySQL/MariaDB migration...');
      
      // For MySQL/MariaDB, modify the column directly
      await sequelize.query(`
        ALTER TABLE purchase_rates 
        MODIFY COLUMN rate_type ENUM('CDL', 'CDWB', 'MDL', 'MDWB') NOT NULL;
      `);
      console.log('✅ Updated ENUM column');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📝 Rate type CDWM has been replaced with CDWB');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runRateTypeMigration();
}

module.exports = runRateTypeMigration;
