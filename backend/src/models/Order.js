const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    order_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    associate_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    associate_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('authorized', 'separating', 'packed', 'shipped', 'delivered'),
        defaultValue: 'authorized'
    },
    source: {
        type: DataTypes.STRING,
        defaultValue: 'sindmotoristas'
    },
    purchased_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    received_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    separation_started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    separation_finished_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    shipping_started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    delivered_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    garage: DataTypes.STRING,
    delivery_address: DataTypes.TEXT,
    payment_method: {
        type: DataTypes.STRING,
        defaultValue: 'pix'
    },
    pix_code: DataTypes.TEXT
});

module.exports = Order;
