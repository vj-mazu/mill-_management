'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('arrivals', 'snapshot_rate', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Snapshot of kunchinittu average rate at time of production-shifting entry'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('arrivals', 'snapshot_rate');
  }
};
