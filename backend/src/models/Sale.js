const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
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
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    final_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.ENUM('cash', 'credit', 'debit', 'pix', 'mixed', 'payroll'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('completed', 'cancelled', 'pending'),
        defaultValue: 'completed'
    },
    authorized_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    operator_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    cancellation_reason: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    cancellation_protocol: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    cancelled_at: {
        type: DataTypes.DATE,
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
        type: DataTypes.STRING(50),
        defaultValue: 'none'
    },
    cpf_nota: {
        type: DataTypes.STRING(20),
        allowNull: true
    }
}, {
    tableName: 'sales',
    underscored: true,
    timestamps: true
});

module.exports = Sale;
