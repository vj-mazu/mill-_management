const axios = require('axios');

async function testRiceStockLocation() {
  try {
    // Login first
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'rohit',
      password: 'rohit123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Try to create a rice stock location
    console.log('\nCreating rice stock location...');
    const createResponse = await axios.post('http://localhost:5000/api/locations/rice-stock-locations', {
      code: 'TEST1',
      name: 'Test Location 1'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Rice stock location created:', createResponse.data);
    
    // Fetch all locations
    console.log('\nFetching all rice stock locations...');
    const fetchResponse = await axios.get('http://localhost:5000/api/locations/rice-stock-locations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Locations:', fetchResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testRiceStockLocation();
