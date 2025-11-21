const { sequelize } = require('./config/database');
const RiceProduction = require('./models/RiceProduction');
const Arrival = require('./models/Arrival');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check out02 arrivals (total bags)
    const arrivals = await Arrival.findAll({
      where: { outturnId: 2 },
      attributes: ['id', 'bags', 'movementType', 'date'],
      raw: true
    });

    console.log('📦 Arrivals for out02 (Total Bags):');
    console.log(JSON.stringify(arrivals, null, 2));
    const totalBags = arrivals.reduce((sum, a) => sum + (a.bags || 0), 0);
    console.log(`\nTotal Bags: ${totalBags}\n`);

    // Check out02 rice productions (bags entered)
    const prods = await RiceProduction.findAll({
      where: { outturnId: 2 },
      attributes: ['id', 'bags', 'paddyBagsDeducted', 'productType', 'date', 'status'],
      raw: true
    });

    console.log('🌾 Rice Productions for out02:');
    console.log(JSON.stringify(prods, null, 2));
    const totalBagsEntered = prods.reduce((sum, p) => sum + (p.bags || 0), 0);
    const totalPaddyDeducted = prods.reduce((sum, p) => sum + (p.paddyBagsDeducted || 0), 0);
    console.log(`\nTotal Bags Entered: ${totalBagsEntered}`);
    console.log(`Total Paddy Deducted: ${totalPaddyDeducted}`);
    console.log(`\nRemaining (Correct): ${totalBags} - ${totalBagsEntered} = ${totalBags - totalBagsEntered}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
