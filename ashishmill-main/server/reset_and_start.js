const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
  try {
    console.log('🔄 Starting complete database reset...');
    
    // Read the reset SQL script
    const resetScript = fs.readFileSync(path.join(__dirname, 'reset_database_complete.sql'), 'utf8');
    
    // Execute the reset script
    await sequelize.query(resetScript);
    
    console.log('✅ Database reset completed successfully!');
    console.log('📝 Default users created:');
    console.log('   👤 Staff: username=staff, password=staff123');
    console.log('   👤 Manager: username=rohit, password=rohit456');
    console.log('   👤 Admin: username=ashish, password=ashish789');
    console.log('🏢 Sample warehouses and varieties created');
    console.log('🎉 Chain system is now properly configured!');
    console.log('');
    console.log('✨ Key Features:');
    console.log('   • Kunchinittu names are globally unique');
    console.log('   • Same variety can exist in different warehouses');
    console.log('   • Proper chain system for purchase and shifting');
    console.log('   • Auto-populated arrival dates');
    console.log('   • Enhanced PDF exports with frontend formatting');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;