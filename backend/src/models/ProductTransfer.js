const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductTransfer = sequelize.define('ProductTransfer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    origin_tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    destination_tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('draft', 'in_transit', 'received', 'cancelled'),
        defaultValue: 'in_transit'
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    cfop: {
        type: DataTypes.STRING(4),
        defaultValue: '5151'
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
    },
    received_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    dispatched_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    received_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'product_transfers',
    underscored: true,
    timestamps: true
});

module.exports = ProductTransfer;
