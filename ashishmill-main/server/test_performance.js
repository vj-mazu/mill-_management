require('dotenv').config();
const { sequelize } = require('./config/database');
const Arrival = require('./models/Arrival');

/**
 * Performance test script
 * Tests query performance with large datasets
 */

async function testPerformance() {
  console.log('🧪 Performance Testing\n');
  console.log('='.repeat(60));
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Test 1: Count total records
    console.log('1️⃣ Testing COUNT query...');
    const countStart = Date.now();
    const count = await Arrival.count();
    const countTime = Date.now() - countStart;
    console.log(`   Total records: ${count.toLocaleString()}`);
    console.log(`   Time: ${countTime}ms`);
    console.log(`   Status: ${countTime < 100 ? '✅ FAST' : '⚠️  SLOW'}\n`);

    // Test 2: Paginated query with indexes
    console.log('2️⃣ Testing PAGINATED query (50 records)...');
    const paginatedStart = Date.now();
    const paginated = await Arrival.findAll({
      where: { status: 'approved' },
      attributes: ['id', 'date', 'bags', 'netWeight', 'variety'],
      limit: 50,
      offset: 0,
      order: [['date', 'DESC']]
    });
    const paginatedTime = Date.now() - paginatedStart;
    console.log(`   Records returned: ${paginated.length}`);
    console.log(`   Time: ${paginatedTime}ms`);
    console.log(`   Status: ${paginatedTime < 50 ? '✅ FAST' : paginatedTime < 100 ? '⚠️  OK' : '❌ SLOW'}\n`);

    // Test 3: Date range query with index
    console.log('3️⃣ Testing DATE RANGE query...');
    const dateStart = Date.now();
    const dateQuery = await Arrival.findAll({
      where: {
        status: 'approved',
        date: {
          [sequelize.Sequelize.Op.gte]: '2024-01-01',
          [sequelize.Sequelize.Op.lte]: '2024-12-31'
        }
      },
      attributes: ['id', 'date', 'bags'],
      limit: 100
    });
    const dateTime = Date.now() - dateStart;
    console.log(`   Records returned: ${dateQuery.length}`);
    console.log(`   Time: ${dateTime}ms`);
    console.log(`   Status: ${dateTime < 50 ? '✅ FAST' : dateTime < 100 ? '⚠️  OK' : '❌ SLOW'}\n`);

    // Test 4: Check indexes
    console.log('4️⃣ Checking INDEXES...');
    const indexes = await sequelize.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('arrivals', 'hamali_entries', 'rice_productions')
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    const indexesByTable = {};
    indexes[0].forEach(idx => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    Object.keys(indexesByTable).forEach(table => {
      console.log(`   ${table}: ${indexesByTable[table].length} indexes`);
      indexesByTable[table].forEach(idx => {
        console.log(`      - ${idx}`);
      });
    });

    // Test 5: Raw SQL performance
    console.log('\n5️⃣ Testing RAW SQL query...');
    const rawStart = Date.now();
    const rawResult = await sequelize.query(`
      SELECT COUNT(*) as total 
      FROM arrivals 
      WHERE status = 'approved'
    `);
    const rawTime = Date.now() - rawStart;
    console.log(`   Count: ${rawResult[0][0].total}`);
    console.log(`   Time: ${rawTime}ms`);
    console.log(`   Status: ${rawTime < 10 ? '✅ VERY FAST' : rawTime < 50 ? '✅ FAST' : '⚠️  SLOW'}\n`);

    // Performance Summary
    console.log('='.repeat(60));
    console.log('📊 PERFORMANCE SUMMARY\n');
    
    const avgTime = (countTime + paginatedTime + dateTime + rawTime) / 4;
    console.log(`   Average query time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Total records: ${count.toLocaleString()}`);
    console.log(`   Indexes: ${indexes[0].length} performance indexes`);
    
    if (avgTime < 50) {
      console.log('\n   ✅ EXCELLENT - System optimized for 300K+ records');
    } else if (avgTime < 100) {
      console.log('\n   ⚠️  GOOD - Consider adding more indexes for better performance');
    } else {
      console.log('\n   ❌ NEEDS OPTIMIZATION - Check indexes and query patterns');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:\n');
    
    if (count > 200000) {
      console.log('   ✅ Large dataset detected (200K+ records)');
      console.log('   ✅ Always use pagination (limit/offset)');
      console.log('   ✅ Use date filters when possible');
      console.log('   ✅ Consider caching for frequently accessed data');
    }
    
    if (paginatedTime > 100) {
      console.log('   ⚠️  Paginated queries are slow');
      console.log('   → Check if indexes are created (run migrations)');
      console.log('   → Use selective attributes (don\'t load all fields)');
    }
    
    if (indexes[0].length < 15) {
      console.log('   ⚠️  Missing performance indexes');
      console.log('   → Run: npm run dev (auto-runs migrations)');
      console.log('   → Or: node init_database.js');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Performance test completed!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Performance test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
testPerformance();
