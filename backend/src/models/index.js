const sequelize = require('../config/database');
const Tenant = require('./Tenant');
const User = require('./User');
const Product = require('./Product');
const InventoryBatch = require('./InventoryBatch');
const Category = require('./Category');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Customer = require('./Customer');
const Prescriber = require('./Prescriber');
const Supplier = require('./Supplier');
const CashierSession = require('./CashierSession');
const CashierTransaction = require('./CashierTransaction');
const FinancialEntry = require('./FinancialEntry');
const Role = require('./Role');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Terminal = require('./Terminal');
const ProductReturn = require('./ProductReturn');
const ProductReturnItem = require('./ProductReturnItem');
const ProductTransfer = require('./ProductTransfer');
const ProductTransferItem = require('./ProductTransferItem');

// Associations
Tenant.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Product, { foreignKey: 'tenant_id', as: 'products' });
Product.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Supplier, { foreignKey: 'tenant_id', as: 'suppliers' });
Supplier.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Category, { foreignKey: 'tenant_id', as: 'categories' });
Category.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category_rel' });

Tenant.hasMany(Sale, { foreignKey: 'tenant_id', as: 'sales' });
Sale.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Customer.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'sale_items' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product_sale' });

Product.hasMany(InventoryBatch, { foreignKey: 'product_id', as: 'batches' });
InventoryBatch.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Tenant.hasMany(Customer, { foreignKey: 'tenant_id', as: 'customers' });
Customer.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Prescriber, { foreignKey: 'tenant_id', as: 'prescribers' });
Prescriber.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });


// Cashier Associations
Tenant.hasMany(CashierSession, { foreignKey: 'tenant_id', as: 'cashier_sessions' });
CashierSession.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

User.hasMany(CashierSession, { foreignKey: 'user_id', as: 'cashier_sessions' });
CashierSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

CashierSession.hasMany(CashierTransaction, { foreignKey: 'cashier_session_id', as: 'transactions' });
CashierTransaction.belongsTo(CashierSession, { foreignKey: 'cashier_session_id', as: 'session' });

Tenant.hasMany(Terminal, { foreignKey: 'tenant_id', as: 'terminals' });
Terminal.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Terminal.hasMany(CashierSession, { foreignKey: 'terminal_id', as: 'cashier_sessions' });
CashierSession.belongsTo(Terminal, { foreignKey: 'terminal_id', as: 'terminal' });

// Financial Associations
Tenant.hasMany(FinancialEntry, { foreignKey: 'tenant_id', as: 'financial_entries' });
FinancialEntry.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Supplier.hasMany(FinancialEntry, { foreignKey: 'supplier_id', as: 'payments' });
FinancialEntry.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

Customer.hasMany(FinancialEntry, { foreignKey: 'customer_id', as: 'receivables' });
FinancialEntry.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// Role Associations
Tenant.hasMany(Role, { foreignKey: 'tenant_id', as: 'roles' });
Role.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role_rel' });

// Order Associations
Tenant.hasMany(Order, { foreignKey: 'tenant_id', as: 'orders' });
Order.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Return Associations
Tenant.hasMany(ProductReturn, { foreignKey: 'tenant_id', as: 'returns' });
ProductReturn.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
ProductReturn.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
ProductReturn.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
ProductReturn.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ProductReturn.hasMany(ProductReturnItem, { foreignKey: 'return_id', as: 'items' });
ProductReturnItem.belongsTo(ProductReturn, { foreignKey: 'return_id', as: 'return' });
ProductReturnItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Transfer Associations
ProductTransfer.belongsTo(Tenant, { foreignKey: 'origin_tenant_id', as: 'origin_tenant' });
ProductTransfer.belongsTo(Tenant, { foreignKey: 'destination_tenant_id', as: 'destination_tenant' });
ProductTransfer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ProductTransfer.belongsTo(User, { foreignKey: 'received_by', as: 'receiver' });

ProductTransfer.hasMany(ProductTransferItem, { foreignKey: 'transfer_id', as: 'items' });
ProductTransferItem.belongsTo(ProductTransfer, { foreignKey: 'transfer_id', as: 'transfer' });
ProductTransferItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

const StoreConfig = require('./StoreConfig')(sequelize);
const PixConfig = require('./PixConfig')(sequelize);

Tenant.hasOne(StoreConfig, { foreignKey: 'tenant_id', as: 'store_config' });
StoreConfig.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasOne(PixConfig, { foreignKey: 'tenant_id', as: 'pix_config' });
PixConfig.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

module.exports = {
    Tenant,
    User,
    Product,
    InventoryBatch,
    Category,
    Sale,
    SaleItem,
    Customer,
    Prescriber,
                Supplier,
    CashierSession,
    CashierTransaction,
    FinancialEntry,
    Role,
    Order,
    OrderItem,
    Terminal,
    ProductReturn,
    ProductReturnItem,
    ProductTransfer,
    ProductTransferItem,
    StoreConfig,
    PixConfig,
    sequelize
};
