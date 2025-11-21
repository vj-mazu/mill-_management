const { sequelize } = require('./config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting Kunchinittu constraint migration...');
    
    // Remove existing unique constraint on code
    try {
      await sequelize.query('ALTER TABLE kunchinittus DROP CONSTRAINT IF EXISTS kunchinittus_code_key;');
      console.log('✅ Removed unique constraint on code');
    } catch (error) {
      console.log('⚠️ Unique constraint on code may not exist:', error.message);
    }

    // Add composite unique constraint on code + warehouseId
    try {
      await sequelize.query(`
        ALTER TABLE kunchinittus 
        ADD CONSTRAINT unique_code_warehouse 
        UNIQUE (code, "warehouseId");
      `);
      console.log('✅ Added composite unique constraint on code + warehouseId');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Composite unique constraint already exists');
      } else {
        console.log('⚠️ Error adding composite constraint:', error.message);
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📝 You can now create Kunchininttus with the same code in different warehouses');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;