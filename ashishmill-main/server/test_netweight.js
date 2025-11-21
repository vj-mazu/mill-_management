const { sequelize } = require('./config/database');

async function checkNetWeight() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Check all arrivals net weight
    const [results] = await sequelize.query(`
      SELECT 
        id, "slNo", "movementType", bags, 
        "grossWeight", "tareWeight", "netWeight"
      FROM arrivals 
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log('📊 Recent arrivals netWeight values:\n');
    results.forEach(r => {
      console.log(`ID: ${r.id} | SL: ${r.slNo} | Type: ${r.movementType}`);
      console.log(`  Gross: ${r.grossWeight} | Tare: ${r.tareWeight} | Net: ${r.netWeight}`);
      console.log(`  Calculated: ${parseFloat(r.grossWeight) - parseFloat(r.tareWeight)}\n`);
    });
    
    // Check count of zero netWeight
    const [count] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM arrivals 
      WHERE "netWeight" = 0 OR "netWeight" IS NULL
    `);
    
    console.log(`\n⚠️  Records with 0 or NULL netWeight: ${count[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkNetWeight();
