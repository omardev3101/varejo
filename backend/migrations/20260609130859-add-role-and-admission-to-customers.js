'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('customers', 'role', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('customers', 'admission_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('customers', 'role');
    await queryInterface.removeColumn('customers', 'admission_date');
  }
};
