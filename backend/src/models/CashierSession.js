const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CashierSession = sequelize.define('CashierSession', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    terminal_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    opening_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    closing_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    expected_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('open', 'closed'),
        defaultValue: 'open'
    },
    opened_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'cashier_sessions',
    underscored: true
});

module.exports = CashierSession;
