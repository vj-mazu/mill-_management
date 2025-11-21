// Script to manually recalculate all yield percentages
require('dotenv').config();
const YieldCalculationService = require('./services/YieldCalculationService');

async function recalculateAll() {
  try {
    console.log('🔄 Starting yield recalculation for all outturns...\n');
    await YieldCalculationService.recalculateAllYields();
    console.log('\n✅ All yields recalculated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

recalculateAll();
