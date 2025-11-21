const axios = require('axios');

(async () => {
  try {
    // Test the available-bags endpoint
    const response = await axios.get('http://localhost:5000/api/rice-productions/outturn/2/available-bags');
    
    console.log('API Response for out02:');
    console.log(JSON.stringify(response.data, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️ Server is not running. Start the server first.');
    process.exit(1);
  }
})();
