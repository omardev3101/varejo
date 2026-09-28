const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Terminal = sequelize.define('Terminal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    tableName: 'terminals',
    underscored: true,
    timestamps: true
});

module.exports = Terminal;
