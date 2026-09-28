const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tenant = sequelize.define('Tenant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cnpj: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    address: DataTypes.TEXT,
    phone: DataTypes.STRING,
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active'
    },
    default_min_stock: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    },
    shared_stock_tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'tenants',
            key: 'id'
        }
    },

    // ---- FISCAL & NFC-e ----
    state_registration: DataTypes.STRING,
    municipal_registration: DataTypes.STRING,
    fiscal_regime: DataTypes.STRING, // Simples Nacional, Lucro Presumido, Lucro Real
    csc_token: DataTypes.STRING,
    csc_id: DataTypes.STRING,
    nfce_certificate_password: DataTypes.STRING,
    nfce_certificate_base64: DataTypes.TEXT,
    nfce_certificate_filename: DataTypes.STRING,
    nfce_series: { type: DataTypes.INTEGER, defaultValue: 1 },
    nfce_next_number: { type: DataTypes.INTEGER, defaultValue: 1 },
    fiscal_environment: { type: DataTypes.STRING, defaultValue: 'homologation' }, // homologation, production

    // ---- SNGPC (Anvisa) ----
    sngpc_active: { type: DataTypes.BOOLEAN, defaultValue: false },
    sngpc_technical_manager: DataTypes.STRING,
    sngpc_crf: DataTypes.STRING,
    sngpc_email: DataTypes.STRING,
    sngpc_password: DataTypes.STRING,

    // ---- PBM / Convênios ----
    cnes: DataTypes.STRING,
    promocional_environment: { type: DataTypes.STRING, defaultValue: 'homologation' }, // homologation, production
    pbm_active: { type: DataTypes.BOOLEAN, defaultValue: false },
    pbm_provider: DataTypes.STRING, // Desconto Promocional, Vidalink, E-pharma, etc.
    pbm_username: DataTypes.STRING,
    pbm_password: DataTypes.STRING,
    promocional_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },

    // ---- MÓDULOS PERMITIDOS ----
    allowed_modules: {
        type: DataTypes.JSON,
        defaultValue: []
    }
}, {
    tableName: 'tenants'
});

module.exports = Tenant;
