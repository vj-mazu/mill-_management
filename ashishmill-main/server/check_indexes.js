const { sequelize } = require('./config/database');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check indexes
    const [indexes] = await sequelize.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);

    console.log('📊 Database Indexes:\n');
    let currentTable = '';
    indexes.forEach(idx => {
      if (idx.tablename !== currentTable) {
        currentTable = idx.tablename;
        console.log(`\n${currentTable}:`);
      }
      console.log(`  - ${idx.indexname}`);
    });

    console.log('\n✅ Total indexes:', indexes.length);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
