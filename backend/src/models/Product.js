const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
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
    ean: DataTypes.STRING,
    ncm: DataTypes.STRING,
    ms_registry: DataTypes.STRING,
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    stock_qty: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    min_stock: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    is_controlled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_promocional: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // ---- NOVOS CAMPOS (Geral) ----
    manufacturer: DataTypes.STRING,
    brand: DataTypes.STRING,
    product_line: DataTypes.STRING,
    section: DataTypes.STRING,
    section_code: DataTypes.STRING,
    unit: { type: DataTypes.STRING, defaultValue: 'UN' },
    continuous_use: { type: DataTypes.BOOLEAN, defaultValue: false },
    weight: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    print_label: { type: DataTypes.BOOLEAN, defaultValue: true },
    location: DataTypes.STRING,

    // ---- NOVOS CAMPOS (Tributação) ----
    tax_type: { type: DataTypes.STRING, defaultValue: 'ST' }, // TR (Tributado), ST (Substituição Tributária), IS (Isento), NT (Não Tributado), SN (Simples Nacional)
    tax_situation: DataTypes.STRING,
    cst_csosn: { type: DataTypes.STRING, defaultValue: '500' }, // 00, 20, 40, 41, 60, 102, 103, 500
    cfop: { type: DataTypes.STRING, defaultValue: '5405' }, // 5102, 5405
    cest: DataTypes.STRING,
    origin: { type: DataTypes.STRING, defaultValue: '0' }, // 0 - Nacional, 1 - Estrangeira Importação, 2 - Estrangeira Interna
    cst_pis: { type: DataTypes.STRING, defaultValue: '04' }, // 01, 04, 06, 49, 99
    cst_cofins: { type: DataTypes.STRING, defaultValue: '04' }, // 01, 04, 06, 49, 99
    pis_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    cofins_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    icms_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    icms_base: { type: DataTypes.DECIMAL(10, 4), defaultValue: 100 },
    icms_reduced_base: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
    fiscal_list: { type: DataTypes.STRING, defaultValue: 'N' }, // P - Positiva, N - Neutra, M - Negativa

    // ---- NOVOS CAMPOS (Precificação e Comercial) ----
    profit_margin: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
    max_discount_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    pays_commission: { type: DataTypes.BOOLEAN, defaultValue: false },
    commission_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    is_promotional: { type: DataTypes.BOOLEAN, defaultValue: false },
    promo_start_date: DataTypes.DATEONLY,
    promo_end_date: DataTypes.DATEONLY,
    wholesale_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    wholesale_min_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
    free_price: { type: DataTypes.BOOLEAN, defaultValue: false },
    bonus_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },

    // ---- NOVOS CAMPOS (Regulatório) ----
    regulation_portaria: DataTypes.STRING,

    // ---- NOVOS CAMPOS (Compras/Estoque) ----
    purchase_packaging: { type: DataTypes.INTEGER, defaultValue: 1 },
    reference_code: DataTypes.STRING,
    default_supplier_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'suppliers',
            key: 'id'
        }
    },
    category: DataTypes.STRING,
    image_url: DataTypes.STRING,
    category_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'categories',
            key: 'id'
        }
    }
}, {
    tableName: 'products'
});

module.exports = Product;
