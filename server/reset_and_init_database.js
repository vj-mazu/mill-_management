require('dotenv').config();
const { sequelize } = require('./config/database');

async function resetAndInitDatabase() {
  try {
    console.log('🔄 Starting complete database reset and initialization...\n');

    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Step 2: Drop all tables
    console.log('2️⃣ Dropping all existing tables...');
    await sequelize.drop({ cascade: true });
    console.log('✅ All tables dropped successfully.\n');

    // Step 3: Close connection and run init_database
    console.log('3️⃣ Closing connection to run full initialization...');
    await sequelize.close();
    console.log('✅ Connection closed.\n');

    console.log('4️⃣ Running full database initialization...');
    console.log('   Please wait while all tables, indexes, and users are created...\n');
    
    // Import and run init_database
    require('./init_database');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run reset
resetAndInitDatabase();
