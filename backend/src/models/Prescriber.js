const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prescriber = sequelize.define('Prescriber', {
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
    license_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    license_state: {
        type: DataTypes.STRING(2),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('CRM', 'CRO', 'CRV'),
        allowNull: false
    }
}, {
    tableName: 'prescribers',
    underscored: true,
    timestamps: true
});

module.exports = Prescriber;
