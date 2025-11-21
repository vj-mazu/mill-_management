const { sequelize } = require('./config/database');
const Arrival = require('./models/Arrival');
const { Warehouse, Kunchinittu, Variety } = require('./models/Location');
const User = require('./models/User');

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`📊 Found ${tables.length} tables:`, tables);
    
    // Check if main tables exist
    const requiredTables = ['users', 'warehouses', 'kunchinittus', 'varieties', 'arrivals'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
      console.log('🔧 Running database sync...');
      
      await sequelize.sync({ force: false, alter: true });
      console.log('✅ Database sync completed');
    }
    
    // Check if users exist
    const userCount = await User.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('🔧 Creating default users...');
      await require('./seeders/createDefaultUsers')();
      console.log('✅ Default users created');
    }
    
    // Check arrivals
    const arrivalCount = await Arrival.count();
    console.log(`📦 Arrivals in database: ${arrivalCount}`);
    
    // Check locations
    const warehouseCount = await Warehouse.count();
    const kunchinintuCount = await Kunchinittu.count();
    const varietyCount = await Variety.count();
    
    console.log(`🏢 Warehouses: ${warehouseCount}`);
    console.log(`📍 Kunchinittus: ${kunchinintuCount}`);
    console.log(`🌾 Varieties: ${varietyCount}`);
    
    if (warehouseCount === 0) {
      console.log('🔧 Creating sample warehouses...');
      await Warehouse.bulkCreate([
        { name: 'GODOWN1', code: 'GD1', location: 'Main Storage Area' },
        { name: 'GODOWN2', code: 'GD2', location: 'Secondary Storage Area' },
        { name: 'PEGZA', code: 'PGZ', location: 'Pegza Storage Facility' }
      ]);
      console.log('✅ Sample warehouses created');
    }
    
    if (varietyCount === 0) {
      console.log('🔧 Creating sample varieties...');
      await Variety.bulkCreate([
        { name: 'DEC24 RNR', code: 'D24RNR', description: 'December 2024 RNR Variety' },
        { name: 'DEC24 P SONA', code: 'D24PS', description: 'December 2024 P Sona Variety' },
        { name: 'JAN25 BASMATI', code: 'J25BAS', description: 'January 2025 Basmati Variety' }
      ]);
      console.log('✅ Sample varieties created');
    }
    
    console.log('🎉 Database check completed successfully!');
    console.log('🚀 Server should now work properly');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabase();
}

module.exports = checkDatabase;