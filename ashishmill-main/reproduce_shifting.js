const { sequelize } = require('./server/config/database');
const { Kunchinittu, Warehouse, Variety } = require('./server/models/Location');
const Arrival = require('./server/models/Arrival');
const Outturn = require('./server/models/Outturn');
const User = require('./server/models/User');
const { calculateKunchinintuStock, calculateWeightedAverage } = require('./server/services/StockCalculationService');
const queryOptimizationService = require('./server/services/queryOptimizationService');
const fs = require('fs');

const logFile = 'server_debug.log';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, `[SCRIPT] ${msg}\n`);
};

async function testShiftingRateTransfer() {
    try {
        // Clear log file
        fs.writeFileSync(logFile, '');

        await sequelize.authenticate();
        log('Database connected.');

        // 1. Setup Data
        let user = await User.findOne({ where: { role: 'admin' } });
        if (!user) {
            log('Admin user not found, trying any user...');
            user = await User.findOne();
        }
        if (!user) {
            log('No user found, creating one...');
            user = await User.create({
                username: 'testadmin',
                password: 'password',
                role: 'admin'
            });
        }
        log(`Using user: ${user.username} (${user.role})`);

        const variety = await Variety.create({
            name: 'Test Variety ' + Date.now(),
            code: 'TV' + Date.now()
        });

        const warehouseA = await Warehouse.create({
            name: 'Warehouse A ' + Date.now(),
            code: 'WHA' + Date.now()
        });

        const warehouseB = await Warehouse.create({
            name: 'Warehouse B ' + Date.now(),
            code: 'WHB' + Date.now()
        });

        const kunchinittuA = await Kunchinittu.create({
            name: 'Kunchinittu A ' + Date.now(),
            code: 'KA' + Date.now(),
            warehouseId: warehouseA.id,
            varietyId: variety.id,
            averageRate: 2000 // Initial Rate
        });

        const kunchinittuB = await Kunchinittu.create({
            name: 'Kunchinittu B ' + Date.now(),
            code: 'KB' + Date.now(),
            warehouseId: warehouseB.id,
            varietyId: variety.id,
            averageRate: 0 // Empty
        });
        log(`Kunchinittu A Rate: ${kunchinittuA.averageRate}`);
        log(`Kunchinittu B Rate: ${kunchinittuB.averageRate}`);

        // 2. Add Stock to A (Purchase)
        const purchase = await Arrival.create({
            slNo: 'PUR' + Date.now(),
            date: new Date(),
            movementType: 'purchase',
            variety: variety.name,
            bags: 100,
            toKunchinintuId: kunchinittuA.id,
            toWarehouseId: warehouseA.id,
            wbNo: 'WB1',
            grossWeight: 5100,
            tareWeight: 100,
            netWeight: 5000, // 50 Quintals
            lorryNumber: 'L1',
            status: 'approved',
            createdBy: user.id,
            adminApprovedBy: user.id,
            adminApprovedAt: new Date()
        });

        // Add Purchase Rate (Simulating "Add Rate")
        const PurchaseRate = require('./server/models/PurchaseRate');
        await PurchaseRate.create({
            arrivalId: purchase.id,
            sute: 0,
            suteCalculationMethod: 'per_bag',
            baseRate: 2000,
            rateType: 'CDL',
            baseRateCalculationMethod: 'per_quintal',
            h: 0,
            b: 0,
            bCalculationMethod: 'per_bag',
            lf: 0,
            lfCalculationMethod: 'per_bag',
            egb: 0,
            amountFormula: 'Manual',
            totalAmount: 100000, // 50 * 2000
            averageRate: 2000,
            createdBy: user.id
        });

        // Manually update Kunchinittu Rate to match
        await kunchinittuA.update({ averageRate: 2000 });

        // Verify Stock in A
        const stockA = await calculateKunchinintuStock(kunchinittuA.id);
        const updatedA = await Kunchinittu.findByPk(kunchinittuA.id);
        log(`Stock A: ${stockA.quantity} Quintals`);
        log(`Kunchinittu A Rate After Purchase: ${updatedA.averageRate}`);

        // 3. Perform Shifting A -> B
        log('Performing Shifting A -> B...');
        const shifting = await Arrival.create({
            slNo: 'SH' + Date.now(),
            date: new Date(),
            movementType: 'shifting',
            variety: variety.name,
            bags: 50,
            fromKunchinintuId: kunchinittuA.id,
            fromWarehouseId: warehouseA.id,
            toKunchinintuId: kunchinittuB.id,
            toWarehouseShiftId: warehouseB.id,
            wbNo: 'WB2',
            grossWeight: 2550,
            tareWeight: 50,
            netWeight: 2500, // 25 Quintals
            lorryNumber: 'L2',
            status: 'pending', // Start as pending
            createdBy: user.id
        });

        // 4. Bulk Approve (Admin)
        log('Performing Bulk Approval...');

        const result = await queryOptimizationService.bulkApproveArrivals(
            [shifting.id],
            user.id,
            'admin'
        );

        log(`Bulk Approval Result: ${JSON.stringify(result)}`);

        // Verify B Rate
        const updatedB = await Kunchinittu.findByPk(kunchinittuB.id);
        log(`Final Kunchinittu B Rate: ${updatedB.averageRate}`);

        if (Math.abs(updatedB.averageRate - 2000) < 0.01) {
            log('SUCCESS: Rate transferred correctly.');
        } else {
            log(`FAILURE: Rate did not transfer correctly (Expected ~2000, Got ${updatedB.averageRate})`);
        }

    } catch (error) {
        log(`Test failed: ${error}`);
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

testShiftingRateTransfer();
