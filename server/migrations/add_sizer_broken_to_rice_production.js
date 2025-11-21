const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;

    try {
        console.log('🔄 Migration: Adding "Sizer Broken" to rice_productions...');

        // 1. Find the correct ENUM type name
        const [results] = await sequelize.query(`
            SELECT t.typname
            FROM pg_type t
            WHERE t.typname LIKE 'enum_rice_productions%productType'
            OR t.typname LIKE 'enum_RiceProductions%productType';
        `);

        let enumTypeName = 'enum_rice_productions_productType'; // Default fallback
        if (results && results.length > 0) {
            enumTypeName = results[0].typname;
            console.log(`✅ Found ENUM type name: ${enumTypeName}`);
        } else {
            console.log(`⚠️ Could not find ENUM type dynamically, using default: ${enumTypeName}`);
        }

        // 2. Check if 'Sizer Broken' already exists in the ENUM
        const [enumCheck] = await sequelize.query(`
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'Sizer Broken' 
            AND enumtypid = (
                SELECT oid FROM pg_type WHERE typname = '${enumTypeName}'
            );
        `);

        if (enumCheck && enumCheck.length > 0) {
            console.log('✅ Value "Sizer Broken" already exists in ENUM.');
        } else {
            // Add the value if it doesn't exist
            try {
                await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE 'Sizer Broken';`);
                console.log(`✅ Postgres ENUM type "${enumTypeName}" updated with "Sizer Broken".`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log('✅ Value "Sizer Broken" already exists in ENUM (race condition).');
                } else {
                    console.log('⚠️ Could not update ENUM type:', error.message);
                    throw error;
                }
            }
        }

        // 3. Also update the check constraint (if it exists as a fallback or separate constraint)
        try {
            await sequelize.query('ALTER TABLE "rice_productions" DROP CONSTRAINT IF EXISTS "rice_productions_productType_check";');
        } catch (error) {
            console.log('⚠️ Could not drop constraint (might not exist):', error.message);
        }

        // 4. Add the new check constraint
        try {
            await sequelize.query(`
                ALTER TABLE "rice_productions"
                ADD CONSTRAINT "rice_productions_productType_check"
                CHECK ("productType" IN ('Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Sizer Broken', 'Rejection Broken', 'Broken', 'Zero Broken', 'Faram', 'Unpolished', 'RJ Rice 1', 'RJ Rice 2'));
            `);
            console.log('✅ Check constraint updated.');
        } catch (error) {
            console.log('⚠️ Could not add check constraint (might conflict or not needed):', error.message);
        }

        console.log('✅ Migration completed.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: Remove 'Sizer Broken' from ENUM (not recommended in production)
    console.log('⚠️ Rollback not implemented for ENUM value removal');
  }
};
