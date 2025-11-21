const { Arrival } = require('../models/Arrival');
const { sequelize } = require('../config/database');

async function fixNetWeight() {
  try {
    console.log('🔧 Fixing net weight for all arrivals...');
    
    // Update all records where netWeight is 0 or null
    await sequelize.query(`
      UPDATE arrivals 
      SET "netWeight" = ("grossWeight" - "tareWeight")
      WHERE "netWeight" = 0 OR "netWeight" IS NULL
    `);
    
    console.log('✅ Net weight fixed successfully!');
    
    // Verify the fix
    const result = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM arrivals 
      WHERE "netWeight" = 0 OR "netWeight" IS NULL
    `);
    
    console.log(`📊 Records with 0 or null netWeight remaining: ${result[0][0].count}`);
    
  } catch (error) {
    console.error('❌ Error fixing net weight:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const db = require('../config/database');
  
  db.sequelize.authenticate()
    .then(() => {
      console.log('✅ Database connected');
      return fixNetWeight();
    })
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixNetWeight };
