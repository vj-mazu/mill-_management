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
                return; // Exit early if already exists
            }

            // 3. Add the value to ENUM - wrapped in transaction
            try {
                // IMPORTANT: ALTER TYPE cannot run inside a transaction block in PostgreSQL
                // So we need to run it directly
                await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE IF NOT EXISTS 'Sizer Broken';`);
                console.log(`✅ Postgres ENUM type "${enumTypeName}" updated with "Sizer Broken".`);
            } catch (error) {
                // Fallback for older PostgreSQL versions that don't support IF NOT EXISTS
                if (error.message.includes('IF NOT EXISTS')) {
                    try {
                        await sequelize.query(`ALTER TYPE "${enumTypeName}" ADD VALUE 'Sizer Broken';`);
                        console.log(`✅ Postgres ENUM type "${enumTypeName}" updated with "Sizer Broken" (fallback method).`);
                    } catch (innerError) {
                        if (innerError.message.includes('already exists')) {
                            console.log('✅ Value "Sizer Broken" already exists in ENUM (race condition).');
                        } else {
                            throw innerError;
                        }
                    }
                } else if (error.message.includes('already exists')) {
                    console.log('✅ Value "Sizer Broken" already exists in ENUM.');
                } else {
                    console.log('⚠️ Could not update ENUM type:', error.message);
                    throw error;
                }
            }

            console.log('✅ Migration completed successfully.');
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            // Don't throw - allow server to continue starting
            console.log('⚠️ Continuing despite migration error...');
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Rollback: Remove 'Sizer Broken' from ENUM (not recommended in production)
        console.log('⚠️ Rollback not implemented for ENUM value removal (cannot remove ENUM values safely)');
    }
};
