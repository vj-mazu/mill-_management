const { sequelize } = require('./config/database');

async function fixConstraint() {
  try {
    console.log('🔧 Fixing rice_productions productType constraint...');
    
    // Drop the existing constraint
    await sequelize.query(`
      ALTER TABLE rice_productions 
      DROP CONSTRAINT IF EXISTS rice_productions_producttype_check;
    `);
    console.log('✓ Dropped old constraint');
    
    // Add the new constraint with all product types
    await sequelize.query(`
      ALTER TABLE rice_productions
      ADD CONSTRAINT rice_productions_producttype_check
      CHECK ("productType" IN (
        'Rice', 
        'Bran', 
        'Farm Bran', 
        'Rejection Rice', 
        'Sizer Broken', 
        'Rejection Broken', 
        'Broken', 
        'Zero Broken', 
        'Faram', 
        'Unpolished', 
        'RJ Rice 1', 
        'RJ Rice 2'
      ));
    `);
    console.log('✓ Created new constraint with "Sizer Broken" included');
    
    // Verify the constraint
    const [results] = await sequelize.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'rice_productions_producttype_check';
    `);
    
    console.log('\n✅ Constraint fixed successfully!');
    console.log('Constraint definition:', results[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
    process.exit(1);
  }
}

fixConstraint();
