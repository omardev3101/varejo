const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    default_markup: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 30.00
    },
    default_min_stock: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    }
}, {
    tableName: 'categories'
});

module.exports = Category;
