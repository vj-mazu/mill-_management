const { describe, it, beforeEach, afterEach, before, after } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const { sequelize } = require('../config/database');
const OpeningBalanceService = require('../services/OpeningBalanceService');
const OpeningBalance = require('../models/OpeningBalance');
const BalanceAuditTrail = require('../models/BalanceAuditTrail');
const Arrival = require('../models/Arrival');
const { Kunchinittu } = require('../models/Location');

describe('OpeningBalanceService', () => {
  let sandbox;
  let mockTransaction;

  before(async () => {
    // Setup test database connection if needed
    // This would typically be done in a test setup file
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockTransaction = {
      commit: sinon.stub(),
      rollback: sinon.stub()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(async () => {
    // Cleanup test database if needed
  });

  describe('getOpeningBalance', () => {
    it('should return exact match when opening balance exists for the date', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-15';
      const mockOpeningBalance = {
        openingBags: 100,
        openingNetWeight: 5000.50,
        date: date,
        isManual: true
      };

      sandbox.stub(OpeningBalance, 'findByKunchinintuAndDate').resolves(mockOpeningBalance);

      // Act
      const result = await OpeningBalanceService.getOpeningBalance(kunchinintuId, date);

      // Assert
      expect(result).to.deep.equal({
        bags: 100,
        netWeight: 5000.50,
        date: date,
        isManual: true,
        source: 'exact_match'
      });
      expect(OpeningBalance.findByKunchinintuAndDate).to.have.been.calledWith(kunchinintuId, date);
    });

    it('should calculate balance from latest opening balance when no exact match', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-20';
      const mockLatestBalance = {
        openingBags: 50,
        openingNetWeight: 2500.00,
        date: '2024-01-10'
      };

      sandbox.stub(OpeningBalance, 'findByKunchinintuAndDate').resolves(null);
      sandbox.stub(OpeningBalance, 'findLatestByKunchinittu').resolves(mockLatestBalance);
      sandbox.stub(OpeningBalanceService, 'calculateBalanceFromDate').resolves({
        bags: 75,
        netWeight: 3750.00
      });

      // Act
      const result = await OpeningBalanceService.getOpeningBalance(kunchinintuId, date);

      // Assert
      expect(result).to.deep.equal({
        bags: 75,
        netWeight: 3750.00,
        date: date,
        isManual: false,
        source: 'calculated_from_2024-01-10'
      });
    });

    it('should calculate from start when no opening balance exists', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-15';

      sandbox.stub(OpeningBalance, 'findByKunchinintuAndDate').resolves(null);
      sandbox.stub(OpeningBalance, 'findLatestByKunchinittu').resolves(null);
      sandbox.stub(OpeningBalanceService, 'calculateBalanceFromDate').resolves({
        bags: 25,
        netWeight: 1250.00
      });

      // Act
      const result = await OpeningBalanceService.getOpeningBalance(kunchinintuId, date);

      // Assert
      expect(result).to.deep.equal({
        bags: 25,
        netWeight: 1250.00,
        date: date,
        isManual: false,
        source: 'calculated_from_start'
      });
    });

    it('should throw error when database operation fails', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-15';
      const dbError = new Error('Database connection failed');

      sandbox.stub(OpeningBalance, 'findByKunchinintuAndDate').rejects(dbError);

      // Act & Assert
      try {
        await OpeningBalanceService.getOpeningBalance(kunchinintuId, date);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get opening balance');
      }
    });
  });

  describe('setOpeningBalance', () => {
    it('should create new opening balance successfully', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-15';
      const bags = 100;
      const netWeight = 5000.00;
      const userId = 1;
      const remarks = 'Initial stock';

      const mockKunchinittu = { id: kunchinintuId, name: 'Test Kunchinittu' };
      const mockOpeningBalance = { id: 1, kunchinintuId, date, openingBags: bags, openingNetWeight: netWeight };

      sandbox.stub(Kunchinittu, 'findByPk').resolves(mockKunchinittu);
      sandbox.stub(OpeningBalance, 'findByKunchinintuAndDate').resolves(null);
      sandbox.stub(OpeningBalance, 'upsert').resolves([mockOpeningBalance, true]);
      sandbox.stub(BalanceAuditTrail, 'logBalanceChange').resolves();

      // Act
      const result = await OpeningBalanceService.setOpeningBalance(
        kunchinintuId, date, bags, netWeight, userId, remarks
      );

      // Assert
      expect(result).to.deep.equal({
        id: 1,
        kunchinintuId,
        date,
        bags,
        netWeight,
        isManual: true,
        created: true,
        remarks
      });
      expect(BalanceAuditTrail.logBalanceChange).to.have.been.calledOnce;
    });

    it('should update existing opening balance', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-15';
      const bags = 150;
      const netWeight = 7500.00;
      const userId = 1;

      const mockKunchinittu = { id: kunchinintuId, name: 'Test Kunchinittu' };
      const mockExistingBalance = { openingBags: 100, openingNetWeight: 5000.00 };
      const mockOpeningBalance = { id: 1, kunchinintuId, date, openingBags: bags, openingNetWeight: netWeight };

      sandbox.stub(Kunchinittu, 'findByPk').resolves(mockKunchinittu);
      sandbox.stub(OpeningBalance, 'findByKunchinintuAndDate').resolves(mockExistingBalance);
      sandbox.stub(OpeningBalance, 'upsert').resolves([mockOpeningBalance, false]);
      sandbox.stub(BalanceAuditTrail, 'logBalanceChange').resolves();

      // Act
      const result = await OpeningBalanceService.setOpeningBalance(
        kunchinintuId, date, bags, netWeight, userId
      );

      // Assert
      expect(result.created).to.be.false;
      expect(BalanceAuditTrail.logBalanceChange).to.have.been.calledWith(
        sinon.match({
          previousBalance: { bags: 100, netWeight: 5000.00 },
          newBalance: { bags, netWeight }
        })
      );
    });

    it('should throw error for invalid input parameters', async () => {
      // Act & Assert
      try {
        await OpeningBalanceService.setOpeningBalance(null, '2024-01-15', 100, 5000, 1);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid input parameters');
      }
    });

    it('should throw error when Kunchinittu not found', async () => {
      // Arrange
      sandbox.stub(Kunchinittu, 'findByPk').resolves(null);

      // Act & Assert
      try {
        await OpeningBalanceService.setOpeningBalance(999, '2024-01-15', 100, 5000, 1);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Kunchinittu not found');
      }
    });
  });

  describe('calculateOpeningBalance', () => {
    it('should calculate balance from latest opening balance', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-20';
      const mockLatestBalance = {
        openingBags: 100,
        openingNetWeight: 5000.00,
        date: '2024-01-10'
      };

      sandbox.stub(OpeningBalance, 'findLatestByKunchinittu').resolves(mockLatestBalance);
      sandbox.stub(OpeningBalanceService, 'calculateBalanceFromDate').resolves({
        bags: 125,
        netWeight: 6250.00
      });

      // Act
      const result = await OpeningBalanceService.calculateOpeningBalance(kunchinintuId, date);

      // Assert
      expect(result).to.deep.equal({
        bags: 125,
        netWeight: 6250.00
      });
      expect(OpeningBalanceService.calculateBalanceFromDate).to.have.been.calledWith(
        kunchinintuId,
        '2024-01-10',
        date,
        { bags: 100, netWeight: 5000.00 }
      );
    });

    it('should calculate from start when no opening balance exists', async () => {
      // Arrange
      const kunchinintuId = 1;
      const date = '2024-01-20';

      sandbox.stub(OpeningBalance, 'findLatestByKunchinittu').resolves(null);
      sandbox.stub(OpeningBalanceService, 'calculateBalanceFromDate').resolves({
        bags: 50,
        netWeight: 2500.00
      });

      // Act
      const result = await OpeningBalanceService.calculateOpeningBalance(kunchinintuId, date);

      // Assert
      expect(result).to.deep.equal({
        bags: 50,
        netWeight: 2500.00
      });
      expect(OpeningBalanceService.calculateBalanceFromDate).to.have.been.calledWith(
        kunchinintuId,
        null,
        date,
        { bags: 0, netWeight: 0 }
      );
    });
  });

  describe('calculateBalanceFromDate', () => {
    it('should calculate balance correctly with inward and outward transactions', async () => {
      // Arrange
      const kunchinintuId = 1;
      const startDate = '2024-01-10';
      const endDate = '2024-01-20';
      const startBalance = { bags: 50, netWeight: 2500.00 };

      const mockTransactions = [
        {
          toKunchinintuId: 1,
          fromKunchinintuId: null,
          bags: 100,
          netWeight: 5000.00,
          date: '2024-01-12'
        },
        {
          toKunchinintuId: null,
          fromKunchinintuId: 1,
          bags: 30,
          netWeight: 1500.00,
          date: '2024-01-15'
        },
        {
          toKunchinintuId: 1,
          fromKunchinintuId: null,
          bags: 25,
          netWeight: 1250.00,
          date: '2024-01-18'
        }
      ];

      sandbox.stub(Arrival, 'findAll').resolves(mockTransactions);

      // Act
      const result = await OpeningBalanceService.calculateBalanceFromDate(
        kunchinintuId, startDate, endDate, startBalance
      );

      // Assert
      expect(result).to.deep.equal({
        bags: 145, // 50 + 100 - 30 + 25
        netWeight: 7250.00 // 2500 + 5000 - 1500 + 1250
      });
    });

    it('should handle empty transaction list', async () => {
      // Arrange
      const kunchinintuId = 1;
      const startDate = '2024-01-10';
      const endDate = '2024-01-20';
      const startBalance = { bags: 50, netWeight: 2500.00 };

      sandbox.stub(Arrival, 'findAll').resolves([]);

      // Act
      const result = await OpeningBalanceService.calculateBalanceFromDate(
        kunchinintuId, startDate, endDate, startBalance
      );

      // Assert
      expect(result).to.deep.equal(startBalance);
    });

    it('should handle null start date correctly', async () => {
      // Arrange
      const kunchinintuId = 1;
      const startDate = null;
      const endDate = '2024-01-20';
      const startBalance = { bags: 0, netWeight: 0 };

      sandbox.stub(Arrival, 'findAll').resolves([]);

      // Act
      const result = await OpeningBalanceService.calculateBalanceFromDate(
        kunchinintuId, startDate, endDate, startBalance
      );

      // Assert
      expect(result).to.deep.equal(startBalance);
      expect(Arrival.findAll).to.have.been.calledWith(
        sinon.match({
          where: sinon.match({
            date: { [sinon.match.any]: endDate }
          })
        })
      );
    });
  });

  describe('validateOpeningBalanceData', () => {
    it('should return valid for correct data', () => {
      // Arrange
      const validData = {
        kunchinintuId: 1,
        date: '2024-01-15',
        bags: 100,
        netWeight: 5000.00,
        userId: 1
      };

      // Act
      const result = OpeningBalanceService.validateOpeningBalanceData(validData);

      // Assert
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should return errors for invalid data', () => {
      // Arrange
      const invalidData = {
        kunchinintuId: null,
        date: 'invalid-date',
        bags: -10,
        netWeight: -100,
        userId: null
      };

      // Act
      const result = OpeningBalanceService.validateOpeningBalanceData(invalidData);

      // Assert
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length.greaterThan(0);
      expect(result.errors.join(' ')).to.include('Kunchinittu ID');
      expect(result.errors.join(' ')).to.include('date');
      expect(result.errors.join(' ')).to.include('non-negative');
      expect(result.errors.join(' ')).to.include('user ID');
    });

    it('should validate bags and weight consistency', () => {
      // Arrange
      const inconsistentData = {
        kunchinintuId: 1,
        date: '2024-01-15',
        bags: 100,
        netWeight: 0,
        userId: 1
      };

      // Act
      const result = OpeningBalanceService.validateOpeningBalanceData(inconsistentData);

      // Assert
      expect(result.isValid).to.be.false;
      expect(result.errors.join(' ')).to.include('bags are present, net weight must be greater than 0');
    });
  });

  describe('getOpeningBalanceHistory', () => {
    it('should return opening balance history with filters', async () => {
      // Arrange
      const kunchinintuId = 1;
      const options = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        limit: 10
      };

      const mockHistory = [
        { id: 1, date: '2024-01-15', openingBags: 100, openingNetWeight: 5000 },
        { id: 2, date: '2024-01-10', openingBags: 50, openingNetWeight: 2500 }
      ];

      sandbox.stub(OpeningBalance, 'findAll').resolves(mockHistory);

      // Act
      const result = await OpeningBalanceService.getOpeningBalanceHistory(kunchinintuId, options);

      // Assert
      expect(result).to.equal(mockHistory);
      expect(OpeningBalance.findAll).to.have.been.calledWith(
        sinon.match({
          where: sinon.match({
            kunchinintuId,
            date: sinon.match.object
          }),
          limit: 10
        })
      );
    });

    it('should handle empty history', async () => {
      // Arrange
      const kunchinintuId = 999;
      sandbox.stub(OpeningBalance, 'findAll').resolves([]);

      // Act
      const result = await OpeningBalanceService.getOpeningBalanceHistory(kunchinintuId);

      // Assert
      expect(result).to.be.empty;
    });
  });
});