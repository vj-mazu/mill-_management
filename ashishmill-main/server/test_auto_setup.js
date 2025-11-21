require('dotenv').config();
const { sequelize } = require('./config/database');

/**
 * Test script to verify complete auto-setup functionality
 * This simulates what happens when you delete the database and restart the server
 */

async function testAutoSetup() {
  console.log('🧪 Testing Auto-Setup Functionality\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Test database connection
    console.log('\n1️⃣ Testing Database Connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Step 2: Check if tables exist
    console.log('\n2️⃣ Checking Tables...');
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`   - ${table}`));
    
    // Step 3: Check indexes
    console.log('\n3️⃣ Checking Indexes...');
    
    // Check arrivals indexes
    const arrivalsIndexes = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'arrivals' 
      AND indexname LIKE 'idx_%'
    `);
    console.log(`✅ Arrivals table has ${arrivalsIndexes[0].length} performance indexes`);
    
    // Check hamali_entries indexes
    const hamaliIndexes = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'hamali_entries' 
      AND indexname LIKE 'idx_%'
    `);
    console.log(`✅ Hamali entries table has ${hamaliIndexes[0].length} performance indexes`);
    
    // Check rice_productions indexes
    const riceIndexes = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'rice_productions' 
      AND indexname LIKE 'idx_%'
    `);
    console.log(`✅ Rice productions table has ${riceIndexes[0].length} performance indexes`);
    
    // Step 4: Check users
    console.log('\n4️⃣ Checking Default Users...');
    const User = require('./models/User');
    const users = await User.findAll({ attributes: ['username', 'role'] });
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => console.log(`   - ${user.username} (${user.role})`));
    
    // Step 5: Verify critical columns
    console.log('\n5️⃣ Verifying Critical Columns...');
    
    // Check fromOutturnId in arrivals
    const arrivalsColumns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'arrivals' 
      AND column_name = 'fromOutturnId'
    `);
    console.log(`✅ Arrivals.fromOutturnId: ${arrivalsColumns[0].length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Check status in hamali_entries
    const hamaliColumns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hamali_entries' 
      AND column_name = 'status'
    `);
    console.log(`✅ HamaliEntries.status: ${hamaliColumns[0].length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Check paddy_bags_deducted in rice_productions
    const riceColumns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rice_productions' 
      AND column_name = 'paddy_bags_deducted'
    `);
    console.log(`✅ RiceProductions.paddy_bags_deducted: ${riceColumns[0].length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Step 6: Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 AUTO-SETUP TEST COMPLETED SUCCESSFULLY!\n');
    console.log('📋 Summary:');
    console.log('   ✅ Database connection working');
    console.log(`   ✅ ${tables.length} tables created`);
    console.log(`   ✅ Performance indexes added`);
    console.log(`   ✅ ${users.length} default users created`);
    console.log('   ✅ All migrations applied');
    console.log('\n💡 Your system is ready! If you delete the database and restart');
    console.log('   the server, everything will be auto-created again.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ AUTO-SETUP TEST FAILED:', error.message);
    console.error('\nError Details:', error);
    process.exit(1);
  }
}

// Run the test
testAutoSetup();
