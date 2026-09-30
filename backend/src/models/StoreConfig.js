const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const StoreConfig = sequelize.define('StoreConfig', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        store_name: {
            type: DataTypes.STRING,
            defaultValue: 'VarejoPro - Sua Loja Online'
        },
        slogan: {
            type: DataTypes.STRING,
            defaultValue: 'Produtos, Higiene e Beleza com Entrega Rápida'
        },
        whatsapp: {
            type: DataTypes.STRING,
            defaultValue: '(11) 99999-8888'
        },
        announcement_text: {
            type: DataTypes.STRING,
            defaultValue: '🚚 Frete Grátis em compras acima de R$ 50,00 | 💊 Produtos com até 50% de Desconto'
        },
        free_shipping_min: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 50.00
        },
        opening_hours: {
            type: DataTypes.STRING,
            defaultValue: 'Segunda a Sábado: 07:00 às 22:00 | Domingos: 08:00 às 18:00'
        },
        logo_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        primary_color: {
            type: DataTypes.STRING,
            defaultValue: '#10b981'
        },
        secondary_color: {
            type: DataTypes.STRING,
            defaultValue: '#0f172a'
        },
        system_name: {
            type: DataTypes.STRING,
            defaultValue: 'REY DAS LOUÇAS ERP'
        },
        support_email: {
            type: DataTypes.STRING,
            allowNull: true
        },
        banners_json: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('banners_json');
                if (!rawValue) return [];
                try {
                    return JSON.parse(rawValue);
                } catch (e) {
                    return [];
                }
            },
            set(value) {
                this.setDataValue('banners_json', JSON.stringify(value || []));
            }
        },
        allowed_sections_json: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('allowed_sections_json');
                if (!rawValue) return [];
                try {
                    return JSON.parse(rawValue);
                } catch (e) {
                    return [];
                }
            },
            set(value) {
                this.setDataValue('allowed_sections_json', JSON.stringify(value || []));
            }
        }
    }, {
        tableName: 'store_configs',
        timestamps: true
    });

    return StoreConfig;
};
