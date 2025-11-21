/**
 * Script to remove ALL data except users
 * This ensures a clean database with only user accounts
 */

const { sequelize } = require('./config/database');
const { Warehouse, Kunchinittu, Variety } = require('./models/Location');
const Packaging = require('./models/Packaging');
const RiceStockLocation = require('./models/RiceStockLocation');

async function removeAllDefaultData() {
  try {
    console.log('🧹 Starting cleanup - Removing all data except users...\n');

    // Delete all packagings
    const packagingCount = await Packaging.destroy({ where: {}, truncate: true });
    console.log(`✅ Deleted ${packagingCount} packaging records`);

    // Delete all varieties
    const varietyCount = await Variety.destroy({ where: {}, truncate: true });
    console.log(`✅ Deleted ${varietyCount} variety records`);

    // Delete all kunchinittus
    const kunchinintuCount = await Kunchinittu.destroy({ where: {}, truncate: true });
    console.log(`✅ Deleted ${kunchinintuCount} kunchinittu records`);

    // Delete all warehouses
    const warehouseCount = await Warehouse.destroy({ where: {}, truncate: true });
    console.log(`✅ Deleted ${warehouseCount} warehouse records`);

    // Delete all rice stock locations
    const riceStockCount = await RiceStockLocation.destroy({ where: {}, truncate: true });
    console.log(`✅ Deleted ${riceStockCount} rice stock location records`);

    console.log('\n✅ Cleanup completed successfully!');
    console.log('📝 Only user accounts remain in the database');
    console.log('👤 Users can now create their own master data\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run cleanup
if (require.main === module) {
  removeAllDefaultData()
    .then(() => {
      console.log('Cleanup script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = removeAllDefaultData;
