const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductReturnItem = sequelize.define('ProductReturnItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    return_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    batch_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'product_return_items',
    underscored: true,
    timestamps: true
});

module.exports = ProductReturnItem;
