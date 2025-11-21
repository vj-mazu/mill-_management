require('dotenv').config();
const { sequelize } = require('./config/database');
const Kunchinittu = require('./models/Kunchinittu');
const Warehouse = require('./models/Warehouse');
const Variety = require('./models/Variety');

async function cleanupDuplicateKunchinittus() {
  try {
    console.log('🔍 Checking for duplicate kunchinittus...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find all kunchinittus
    const allKunchinittus = await Kunchinittu.findAll({
      include: [
        { model: Warehouse, as: 'warehouse' },
        { model: Variety, as: 'variety' }
      ],
      order: [['id', 'ASC']]
    });

    console.log(`📊 Total kunchinittus found: ${allKunchinittus.length}\n`);

    // Group by name to find duplicates
    const nameGroups = {};
    allKunchinittus.forEach(k => {
      const name = k.name.toUpperCase().trim();
      if (!nameGroups[name]) {
        nameGroups[name] = [];
      }
      nameGroups[name].push(k);
    });

    // Find duplicates
    const duplicates = Object.entries(nameGroups).filter(([name, kunchinittus]) => kunchinittus.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate kunchinittus found!\n');
      process.exit(0);
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate kunchinittu name(s):\n`);

    for (const [name, kunchinittus] of duplicates) {
      console.log(`\n📌 Duplicate name: "${name}"`);
      console.log(`   Found ${kunchinittus.length} records:\n`);

      kunchinittus.forEach((k, index) => {
        console.log(`   ${index + 1}. ID: ${k.id}`);
        console.log(`      Name: ${k.name}`);
        console.log(`      Code: ${k.code}`);
        console.log(`      Warehouse: ${k.warehouse?.name || 'N/A'} (${k.warehouse?.code || 'N/A'})`);
        console.log(`      Variety: ${k.variety?.name || 'N/A'}`);
        console.log(`      Created: ${k.createdAt}`);
        console.log('');
      });

      // Keep the oldest one (first by ID), delete the rest
      const toKeep = kunchinittus[0];
      const toDelete = kunchinittus.slice(1);

      console.log(`   ✅ Keeping: ID ${toKeep.id} (oldest)`);
      console.log(`   🗑️  Deleting: ${toDelete.map(k => `ID ${k.id}`).join(', ')}\n`);

      // Delete duplicates
      for (const k of toDelete) {
        await k.destroy();
        console.log(`   ✅ Deleted kunchinittu ID ${k.id}`);
      }
    }

    console.log('\n🎉 Cleanup completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Duplicate names found: ${duplicates.length}`);
    console.log(`   - Records deleted: ${duplicates.reduce((sum, [_, kunchinittus]) => sum + kunchinittus.length - 1, 0)}`);
    console.log(`   - Records kept: ${duplicates.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

cleanupDuplicateKunchinittus();
