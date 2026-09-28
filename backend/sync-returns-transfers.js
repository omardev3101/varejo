const { ProductReturn, ProductReturnItem, ProductTransfer, ProductTransferItem, sequelize } = require('./src/models');

async function syncNewTables() {
    try {
        console.log('Syncing ProductReturn...');
        await ProductReturn.sync({ alter: true });
        console.log('Syncing ProductReturnItem...');
        await ProductReturnItem.sync({ alter: true });
        console.log('Syncing ProductTransfer...');
        await ProductTransfer.sync({ alter: true });
        console.log('Syncing ProductTransferItem...');
        await ProductTransferItem.sync({ alter: true });

        console.log('New tables (ProductReturn, ProductReturnItem, ProductTransfer, ProductTransferItem) synced successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error syncing new tables:', error);
        process.exit(1);
    }
}

syncNewTables();
