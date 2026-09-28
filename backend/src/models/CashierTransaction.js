const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CashierTransaction = sequelize.define('CashierTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cashier_session_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('inflow', 'outflow', 'sale', 'withdrawal', 'addition', 'cancellation', 'discount'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.STRING,
        defaultValue: 'cash'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'cashier_transactions',
    underscored: true,
    timestamps: true
});

module.exports = CashierTransaction;
