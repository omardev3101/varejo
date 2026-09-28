const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FinancialEntry = sequelize.define('FinancialEntry', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('payable', 'receivable'),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
        defaultValue: 'pending'
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'Outros'
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: true
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'financial_entries',
    underscored: true,
    timestamps: true
});

module.exports = FinancialEntry;
