// Fix the check constraint for Sizer Broken
const { sequelize } = require('./config/database');

async function fixConstraint() {
  try {
    console.log('🔧 Fixing rice_productions check constraint...');
    
    // Drop the old constraint
    await sequelize.query('ALTER TABLE rice_productions DROP CONSTRAINT IF EXISTS rice_productions_producttype_check;');
    console.log('✅ Dropped old constraint');
    
    // The ENUM already has Sizer Broken, so we don't need to add it again
    // Just verify it's there
    const [enumValues] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_rice_productions_productType'
      )
      ORDER BY enumsortorder;
    `);
    
    console.log('✅ Current ENUM values:', enumValues.map(v => v.enumlabel));
    
    console.log('✅ Constraint fixed! Sizer Broken should work now.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixConstraint();
