const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductReturn = sequelize.define('ProductReturn', {
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
        type: DataTypes.ENUM('supplier_return', 'customer_return'),
        allowNull: false
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    authorized_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cancellation_reason: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
        defaultValue: 'completed'
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    cfop: {
        type: DataTypes.STRING(4),
        allowNull: true
    },
    fiscal_key: {
        type: DataTypes.STRING(44),
        allowNull: true
    },
    fiscal_protocol: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    fiscal_status: {
        type: DataTypes.ENUM('draft', 'emitted', 'cancelled', 'error'),
        defaultValue: 'draft'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'product_returns',
    underscored: true,
    timestamps: true
});

module.exports = ProductReturn;
