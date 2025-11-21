const { Sequelize } = require('sequelize');

const dbUrl = 'postgresql://postgres.knbgzutzgygdchrpgees:Manjun@1234@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

console.log('Testing connection to:', dbUrl);

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection successful!');
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

testConnection();
