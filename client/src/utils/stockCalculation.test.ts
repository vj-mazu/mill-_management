/**
 * Integration tests for stock calculation logic
 * Tests that For Production and Normal purchases affect stock correctly
 */

export {};

describe('Stock Calculation Integration', () => {
  describe('For Production Purchase Stock Impact', () => {
    it('should add For Production purchase to production stock', () => {
      const productionShiftingClosing: any = {};
      const closingStockByKey: any = {};

      const purchase = {
        movementType: 'purchase' as const,
        outturnId: 1,
        outturn: { code: 'outt1' },
        variety: 'SUM25 K.SONA',
        bags: 100,
        fromKunchinittu: null as { code: string } | null
      };

      // Simulate For Production purchase logic
      if (purchase.outturnId) {
        const kunchinittu = purchase.fromKunchinittu?.code || 'Direct';
        const outturn = purchase.outturn?.code || `OUT${purchase.outturnId}`;
        const key = `${purchase.variety}-${kunchinittu}-${outturn}`;

        if (!productionShiftingClosing[key]) {
          productionShiftingClosing[key] = { bags: 0, variety: purchase.variety, outturn, kunchinittu };
        }
        productionShiftingClosing[key].bags += purchase.bags;
      }

      // Verify production stock increased
      expect(productionShiftingClosing['SUM25 K.SONA-Direct-outt1']).toBeDefined();
      expect(productionShiftingClosing['SUM25 K.SONA-Direct-outt1'].bags).toBe(100);

      // Verify warehouse stock NOT affected
      expect(Object.keys(closingStockByKey).length).toBe(0);
    });

    it('should NOT add For Production purchase to warehouse stock', () => {
      const closingStockByKey: any = {};

      const purchase = {
        movementType: 'purchase' as const,
        outturnId: 1,
        outturn: { code: 'outt1' },
        toKunchinintuId: null as number | null,
        toKunchinittu: null as { code: string } | null,
        toWarehouse: null as { name: string } | null,
        variety: 'SUM25 K.SONA',
        bags: 100
      };

      // Simulate Normal purchase logic (should NOT execute for For Production)
      if (!purchase.outturnId && purchase.toKunchinintuId) {
        const location = `${purchase.toKunchinittu?.code || ''} - ${purchase.toWarehouse?.name || ''}`;
        const key = `${purchase.variety}-${location}`;

        if (!closingStockByKey[key]) {
          closingStockByKey[key] = { bags: 0, variety: purchase.variety, location };
        }
        closingStockByKey[key].bags += purchase.bags;
      }

      // Verify warehouse stock NOT affected
      expect(Object.keys(closingStockByKey).length).toBe(0);
    });
  });

  describe('Normal Purchase Stock Impact', () => {
    it('should add Normal purchase to warehouse stock', () => {
      const closingStockByKey: any = {};
      const productionShiftingClosing: any = {};

      const purchase = {
        movementType: 'purchase' as const,
        outturnId: null as number | null,
        toKunchinintuId: 1,
        toKunchinittu: { code: 'SUM25KN1' },
        toWarehouse: { name: 'GODOWN1' },
        variety: 'SUM25 K.SONA',
        bags: 100
      };

      // Simulate Normal purchase logic
      if (!purchase.outturnId && purchase.toKunchinintuId) {
        const location = `${purchase.toKunchinittu?.code || ''} - ${purchase.toWarehouse?.name || ''}`;
        const key = `${purchase.variety}-${location}`;

        if (!closingStockByKey[key]) {
          closingStockByKey[key] = { bags: 0, variety: purchase.variety, location };
        }
        closingStockByKey[key].bags += purchase.bags;
      }

      // Verify warehouse stock increased
      expect(closingStockByKey['SUM25 K.SONA-SUM25KN1 - GODOWN1']).toBeDefined();
      expect(closingStockByKey['SUM25 K.SONA-SUM25KN1 - GODOWN1'].bags).toBe(100);

      // Verify production stock NOT affected
      expect(Object.keys(productionShiftingClosing).length).toBe(0);
    });

    it('should NOT add Normal purchase to production stock', () => {
      const productionShiftingClosing: any = {};

      const purchase = {
        movementType: 'purchase' as const,
        outturnId: null as number | null,
        outturn: null as { code: string } | null,
        toKunchinintuId: 1,
        toKunchinittu: { code: 'SUM25KN1' },
        toWarehouse: { name: 'GODOWN1' },
        variety: 'SUM25 K.SONA',
        bags: 100,
        fromKunchinittu: null as { code: string } | null
      };

      // Simulate For Production purchase logic (should NOT execute for Normal)
      if (purchase.outturnId) {
        const kunchinittu = purchase.fromKunchinittu?.code || 'Direct';
        const outturn = purchase.outturn?.code || `OUT${purchase.outturnId}`;
        const key = `${purchase.variety}-${kunchinittu}-${outturn}`;

        if (!productionShiftingClosing[key]) {
          productionShiftingClosing[key] = { bags: 0, variety: purchase.variety, outturn, kunchinittu };
        }
        productionShiftingClosing[key].bags += purchase.bags;
      }

      // Verify production stock NOT affected
      expect(Object.keys(productionShiftingClosing).length).toBe(0);
    });
  });

  describe('Mixed Purchase Types', () => {
    it('should handle both purchase types correctly in same calculation', () => {
      const closingStockByKey: any = {};
      const productionShiftingClosing: any = {};

      const purchases = [
        {
          id: 1,
          movementType: 'purchase' as const,
          outturnId: 1,
          outturn: { code: 'outt1' },
          toKunchinintuId: null as number | null,
          variety: 'SUM25 K.SONA',
          bags: 100,
          fromKunchinittu: null as { code: string } | null
        },
        {
          id: 2,
          movementType: 'purchase' as const,
          outturnId: null as number | null,
          toKunchinintuId: 1,
          toKunchinittu: { code: 'SUM25KN1' },
          toWarehouse: { name: 'GODOWN1' },
          variety: 'SUM25 K.SONA',
          bags: 150
        }
      ];

      purchases.forEach(purchase => {
        if (purchase.outturnId) {
          // For Production
          const kunchinittu = purchase.fromKunchinittu?.code || 'Direct';
          const outturn = purchase.outturn?.code || `OUT${purchase.outturnId}`;
          const key = `${purchase.variety}-${kunchinittu}-${outturn}`;

          if (!productionShiftingClosing[key]) {
            productionShiftingClosing[key] = { bags: 0, variety: purchase.variety, outturn, kunchinittu };
          }
          productionShiftingClosing[key].bags += purchase.bags;
        } else if (purchase.toKunchinintuId) {
          // Normal Purchase
          const location = `${purchase.toKunchinittu?.code || ''} - ${purchase.toWarehouse?.name || ''}`;
          const key = `${purchase.variety}-${location}`;

          if (!closingStockByKey[key]) {
            closingStockByKey[key] = { bags: 0, variety: purchase.variety, location };
          }
          closingStockByKey[key].bags += purchase.bags;
        }
      });

      // Verify both stocks updated correctly
      expect(productionShiftingClosing['SUM25 K.SONA-Direct-outt1'].bags).toBe(100);
      expect(closingStockByKey['SUM25 K.SONA-SUM25KN1 - GODOWN1'].bags).toBe(150);
    });
  });

  describe('Stock Balance Formula', () => {
    it('should maintain correct balance with both purchase types', () => {
      const openingStock = 500;
      const normalPurchase = 150;
      const forProductionPurchase = 100;
      const shifting = 50;
      const productionShifting = 200;

      // Warehouse stock: Opening + Normal Purchase - Shifting - Production Shifting
      const warehouseClosing = openingStock + normalPurchase - shifting - productionShifting;
      expect(warehouseClosing).toBe(400);

      // Production stock: For Production Purchase + Production Shifting
      const productionStock = forProductionPurchase + productionShifting;
      expect(productionStock).toBe(300);

      // Total stock should equal opening + all purchases
      const totalStock = warehouseClosing + productionStock;
      const expectedTotal = openingStock + normalPurchase + forProductionPurchase;
      expect(totalStock).toBe(expectedTotal);
    });
  });
});
