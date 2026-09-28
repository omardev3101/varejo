const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
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
    nickname: DataTypes.STRING,
    sex: DataTypes.ENUM('M', 'F', 'O'),
    birth_date: DataTypes.DATEONLY,
    nationality: DataTypes.STRING,
    birth_city: DataTypes.STRING,
    mother_name: DataTypes.STRING,
    cns: DataTypes.STRING,
    cpf: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rg: DataTypes.STRING,
    rg_issuer: DataTypes.STRING,
    marital_status: DataTypes.STRING,
    zip_code: DataTypes.STRING,
    address: DataTypes.STRING,
    number: DataTypes.STRING,
    neighborhood: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    external_id: DataTypes.STRING,
    external_type: DataTypes.STRING,
    status: {
        type: DataTypes.STRING,
        defaultValue: 'ativo'
    },
    profession: DataTypes.STRING,
    role: {
        type: DataTypes.STRING,
        allowNull: true
    },
    admission_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    image_base64: DataTypes.TEXT('long'),
    credit_limit: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    current_debt: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    garage: DataTypes.STRING,
    password: DataTypes.STRING,
    email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    activation_code: DataTypes.STRING,
    activation_expires: DataTypes.DATE,
    authorized_persons: {
        type: DataTypes.JSON,
        defaultValue: []
    }
}, {
    tableName: 'customers',
    underscored: true,
    timestamps: true
});

module.exports = Customer;
