const axios = require('axios');

/**
 * Manual test script for rice stock opening/closing calculation fix
 * Tests the following scenarios:
 * 1. Opening stock equals previous closing stock
 * 2. Initial opening stock calculation from prior transactions
 * 3. Stock continuity across multiple days
 */

async function testRiceStockCalculation() {
  try {
    // Login first
    console.log('=== Rice Stock Calculation Test ===\n');
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'rohit',
      password: 'rohit456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');

    // Test 1: Fetch rice stock for a date range
    console.log('Test 1: Fetching rice stock for date range (Jan 4-7, 2025)...');
    const dateRangeResponse = await axios.get('http://localhost:5000/api/rice-stock', {
      params: {
        dateFrom: '2025-01-04',
        dateTo: '2025-01-07'
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    const riceStock = dateRangeResponse.data.riceStock;
    console.log(`✅ Fetched ${riceStock.length} days of rice stock data\n`);

    // Test 2: Validate opening stock equals previous closing stock
    console.log('Test 2: Validating stock continuity...');
    let continuityErrors = 0;

    for (let i = 1; i < riceStock.length; i++) {
      const prevDay = riceStock[i - 1];
      const currDay = riceStock[i];

      const prevClosing = prevDay.closingStockTotal;
      const currOpening = currDay.openingStockTotal;

      console.log(`  ${prevDay.date} closing: ${prevClosing}Q -> ${currDay.date} opening: ${currOpening}Q`);

      if (Math.abs(prevClosing - currOpening) > 0.01) {
        console.error(`  ❌ CONTINUITY ERROR: ${prevDay.date} closing (${prevClosing}Q) != ${currDay.date} opening (${currOpening}Q)`);
        continuityErrors++;
      } else {
        console.log(`  ✅ Continuity OK`);
      }
    }

    if (continuityErrors === 0) {
      console.log('\n✅ All stock continuity checks passed!\n');
    } else {
      console.log(`\n❌ Found ${continuityErrors} continuity errors\n`);
    }

    // Test 3: Display detailed stock for each day
    console.log('Test 3: Detailed stock breakdown...');
    riceStock.forEach(day => {
      console.log(`\n  Date: ${day.date}`);
      console.log(`  Opening Stock: ${day.openingStockTotal}Q (${day.openingStock.length} items)`);
      console.log(`  Daily Transactions: ${day.productions.length} transactions`);
      console.log(`  Closing Stock: ${day.closingStockTotal}Q (${day.closingStock.length} items)`);

      // Show opening stock items
      if (day.openingStock.length > 0) {
        console.log('  Opening Stock Items:');
        day.openingStock.forEach(item => {
          console.log(`    - ${item.product} (${item.packaging}) @ ${item.location}: ${item.qtls}Q, ${item.bags} bags`);
        });
      }

      // Show transactions
      if (day.productions.length > 0) {
        console.log('  Transactions:');
        day.productions.forEach(prod => {
          const sign = prod.movementType === 'loading' ? '-' : '+';
          console.log(`    ${sign} ${prod.product} (${prod.packaging}): ${prod.qtls}Q, ${prod.bags} bags [${prod.movementType}]`);
        });
      }

      // Show closing stock items
      if (day.closingStock.length > 0) {
        console.log('  Closing Stock Items:');
        day.closingStock.forEach(item => {
          console.log(`    - ${item.product} (${item.packaging}) @ ${item.location}: ${item.qtls}Q, ${item.bags} bags`);
        });
      }
    });

    // Test 4: Test month-based filtering
    console.log('\n\nTest 4: Testing month-based filtering (January 2025)...');
    const monthResponse = await axios.get('http://localhost:5000/api/rice-stock', {
      params: {
        month: '2025-01'
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    const monthStock = monthResponse.data.riceStock;
    console.log(`✅ Fetched ${monthStock.length} days for January 2025`);

    if (monthStock.length > 0) {
      console.log(`  First day: ${monthStock[0].date}, Opening: ${monthStock[0].openingStockTotal}Q`);
      console.log(`  Last day: ${monthStock[monthStock.length - 1].date}, Closing: ${monthStock[monthStock.length - 1].closingStockTotal}Q`);
    }

    // Test 5: Validate first day opening stock includes prior transactions
    console.log('\n\nTest 5: Validating initial opening stock calculation...');
    if (riceStock.length > 0) {
      const firstDay = riceStock[0];
      console.log(`  First day in range: ${firstDay.date}`);
      console.log(`  Opening stock: ${firstDay.openingStockTotal}Q`);
      console.log(`  Opening stock items: ${firstDay.openingStock.length}`);

      if (firstDay.openingStockTotal > 0) {
        console.log('  ✅ Opening stock includes prior transactions');
      } else {
        console.log('  ℹ️  No opening stock (either no prior transactions or this is the first date with data)');
      }
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testRiceStockCalculation();
