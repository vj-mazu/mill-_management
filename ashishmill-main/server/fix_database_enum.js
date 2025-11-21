require('dotenv').config();
const { sequelize } = require('./config/database');

async function fixDatabaseEnum() {
  try {
    console.log('🔧 Fixing database ENUM types...\n');

    // Step 1: Check current enum types
    console.log('1️⃣ Checking current ENUM types...');
    const [enumTypes] = await sequelize.query(`
      SELECT typname FROM pg_type 
      WHERE typname LIKE '%enum_purchase_rates_rate_type%'
      ORDER BY typname;
    `);
    
    console.log('Found ENUM types:');
    enumTypes.forEach(type => console.log(`   - ${type.typname}`));

    // Step 2: Drop old enum type
    console.log('\n2️⃣ Dropping old ENUM type...');
    await sequelize.query(`
      DROP TYPE IF EXISTS enum_purchase_rates_rate_type_old CASCADE;
    `);
    console.log('✅ Old ENUM type dropped');

    // Step 3: Convert column to VARCHAR temporarily
    console.log('\n3️⃣ Converting rate_type column to VARCHAR...');
    await sequelize.query(`
      ALTER TABLE purchase_rates 
      ALTER COLUMN rate_type TYPE VARCHAR(20);
    `);
    console.log('✅ Column converted to VARCHAR');

    // Step 4: Drop existing enum if needed
    console.log('\n4️⃣ Dropping existing ENUM type...');
    await sequelize.query(`
      DROP TYPE IF EXISTS enum_purchase_rates_rate_type CASCADE;
    `);
    console.log('✅ Existing ENUM type dropped');

    // Step 5: Create fresh enum
    console.log('\n5️⃣ Creating fresh ENUM type...');
    await sequelize.query(`
      CREATE TYPE enum_purchase_rates_rate_type AS ENUM('CDL', 'CDWB', 'MDL', 'MDWB');
    `);
    console.log('✅ Fresh ENUM type created');

    // Step 6: Convert column back to enum
    console.log('\n6️⃣ Converting column back to ENUM...');
    await sequelize.query(`
      ALTER TABLE purchase_rates 
      ALTER COLUMN rate_type TYPE enum_purchase_rates_rate_type 
      USING rate_type::enum_purchase_rates_rate_type;
    `);
    console.log('✅ Column converted to ENUM');

    // Step 7: Verify
    console.log('\n7️⃣ Verifying fix...');
    const [finalEnums] = await sequelize.query(`
      SELECT typname FROM pg_type 
      WHERE typname LIKE '%enum_purchase_rates_rate_type%'
      ORDER BY typname;
    `);
    
    console.log('Final ENUM types:');
    finalEnums.forEach(type => console.log(`   - ${type.typname}`));

    console.log('\n✅ Database ENUM fix completed successfully!');
    console.log('🚀 You can now start the server with: npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

fixDatabaseEnum();
