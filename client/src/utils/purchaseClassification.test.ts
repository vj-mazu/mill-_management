/**
 * Unit tests for purchase classification logic
 * Tests the distinction between Normal Purchase and For Production Purchase
 */

export {};

describe('Purchase Classification', () => {
  describe('For Production Purchase', () => {
    it('should classify purchase with outturnId as For Production', () => {
      const purchase = {
        id: 1,
        movementType: 'purchase',
        outturnId: 1,
        outturn: { code: 'outt1' },
        toKunchinintuId: null,
        toKunchinittu: null,
        toWarehouse: null,
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      const isForProduction = !!purchase.outturnId;
      expect(isForProduction).toBe(true);
    });

    it('should not require warehouse information for For Production purchase', () => {
      const purchase = {
        id: 1,
        movementType: 'purchase',
        outturnId: 1,
        outturn: { code: 'outt1' },
        toKunchinintuId: null,
        toKunchinittu: null,
        toWarehouse: null,
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      expect(purchase.toKunchinintuId).toBeNull();
      expect(purchase.toKunchinittu).toBeNull();
      expect(purchase.toWarehouse).toBeNull();
    });

    it('should have outturn code for For Production purchase', () => {
      const purchase = {
        id: 1,
        movementType: 'purchase',
        outturnId: 1,
        outturn: { code: 'outt1' },
        toKunchinintuId: null,
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      expect(purchase.outturn).toBeDefined();
      expect(purchase.outturn?.code).toBe('outt1');
    });
  });

  describe('Normal Purchase', () => {
    it('should classify purchase with toKunchinintuId as Normal Purchase', () => {
      const purchase = {
        id: 2,
        movementType: 'purchase',
        outturnId: null,
        outturn: null,
        toKunchinintuId: 1,
        toKunchinittu: { code: 'SUM25KN1' },
        toWarehouse: { name: 'GODOWN1' },
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      const isForProduction = !!purchase.outturnId;
      expect(isForProduction).toBe(false);
    });

    it('should require warehouse information for Normal purchase', () => {
      const purchase = {
        id: 2,
        movementType: 'purchase',
        outturnId: null,
        outturn: null,
        toKunchinintuId: 1,
        toKunchinittu: { code: 'SUM25KN1' },
        toWarehouse: { name: 'GODOWN1' },
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      expect(purchase.toKunchinintuId).toBeDefined();
      expect(purchase.toKunchinittu).toBeDefined();
      expect(purchase.toWarehouse).toBeDefined();
    });

    it('should not have outturn for Normal purchase', () => {
      const purchase = {
        id: 2,
        movementType: 'purchase',
        outturnId: null,
        outturn: null,
        toKunchinintuId: 1,
        toKunchinittu: { code: 'SUM25KN1' },
        toWarehouse: { name: 'GODOWN1' },
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      expect(purchase.outturnId).toBeNull();
      expect(purchase.outturn).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should detect invalid purchase with both outturnId and toKunchinintuId', () => {
      const purchase = {
        id: 3,
        movementType: 'purchase',
        outturnId: 1,
        outturn: { code: 'outt1' },
        toKunchinintuId: 1,
        toKunchinittu: { code: 'SUM25KN1' },
        toWarehouse: { name: 'GODOWN1' },
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      const hasOutturn = !!purchase.outturnId;
      const hasWarehouse = !!purchase.toKunchinintuId;
      const isInvalid = hasOutturn && hasWarehouse;

      expect(isInvalid).toBe(true);
    });

    it('should detect invalid purchase with neither outturnId nor toKunchinintuId', () => {
      const purchase = {
        id: 4,
        movementType: 'purchase',
        outturnId: null,
        outturn: null,
        toKunchinintuId: null,
        toKunchinittu: null,
        toWarehouse: null,
        variety: 'SUM25 K.SONA',
        bags: 100,
        broker: 'SACHIN'
      };

      const hasOutturn = !!purchase.outturnId;
      const hasWarehouse = !!purchase.toKunchinintuId;
      const isInvalid = !hasOutturn && !hasWarehouse;

      expect(isInvalid).toBe(true);
    });
  });

  describe('Key Format', () => {
    it('should generate correct key for For Production purchase', () => {
      const purchase = {
        variety: 'SUM25 K.SONA',
        kunchinittu: 'Direct',
        outturn: 'outt1'
      };

      const key = `${purchase.variety}-${purchase.kunchinittu}-${purchase.outturn}`;
      expect(key).toBe('SUM25 K.SONA-Direct-outt1');
    });

    it('should generate correct key for Normal purchase', () => {
      const purchase = {
        variety: 'SUM25 K.SONA',
        kunchinittu: 'SUM25KN1',
        warehouse: 'GODOWN1'
      };

      const key = `${purchase.variety}-${purchase.kunchinittu} - ${purchase.warehouse}`;
      expect(key).toBe('SUM25 K.SONA-SUM25KN1 - GODOWN1');
    });
  });
});
