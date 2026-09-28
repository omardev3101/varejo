const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PixConfig = sequelize.define('PixConfig', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        provider: {
            type: DataTypes.STRING,
            defaultValue: 'cora'
        },
        environment: {
            type: DataTypes.STRING,
            defaultValue: 'sandbox' // 'sandbox' or 'production'
        },
        client_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        pix_key: {
            type: DataTypes.STRING,
            allowNull: true
        },
        cert_pem: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        key_pem: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        webhook_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'pix_configs',
        timestamps: true
    });

    return PixConfig;
};
