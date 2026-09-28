const { sequelize } = require('../models');

async function syncMissingColumns() {
    try {
        console.log('--- SYNCING MISSING DATABASE COLUMNS ---');
        
        // 1. Add missing columns to tenants table if they don't exist
        try {
            await sequelize.query('ALTER TABLE tenants ADD COLUMN nfce_certificate_base64 LONGTEXT NULL;');
            console.log('✓ Added nfce_certificate_base64 column to tenants');
        } catch (e) {
            console.log('Column nfce_certificate_base64 already exists or skipped:', e.message);
        }

        try {
            await sequelize.query('ALTER TABLE tenants ADD COLUMN nfce_certificate_filename VARCHAR(255) NULL;');
            console.log('✓ Added nfce_certificate_filename column to tenants');
        } catch (e) {
            console.log('Column nfce_certificate_filename already exists or skipped:', e.message);
        }

        // Product Tax Columns
        const productCols = [
            "ALTER TABLE products ADD COLUMN tax_type VARCHAR(10) DEFAULT 'ST';",
            "ALTER TABLE products ADD COLUMN cst_csosn VARCHAR(10) DEFAULT '500';",
            "ALTER TABLE products ADD COLUMN cfop VARCHAR(10) DEFAULT '5405';",
            "ALTER TABLE products ADD COLUMN cest VARCHAR(20) NULL;",
            "ALTER TABLE products ADD COLUMN origin VARCHAR(5) DEFAULT '0';",
            "ALTER TABLE products ADD COLUMN cst_pis VARCHAR(10) DEFAULT '04';",
            "ALTER TABLE products ADD COLUMN cst_cofins VARCHAR(10) DEFAULT '04';",
            "ALTER TABLE products ADD COLUMN pis_percentage DECIMAL(5,2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN cofins_percentage DECIMAL(5,2) DEFAULT 0;"
        ];

        for (const colSql of productCols) {
            try {
                await sequelize.query(colSql);
            } catch (e) {
                // Column may already exist
            }
        }
        console.log('✓ Verified product tax columns');

        // 2. Ensure pix_configs table exists
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS pix_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL DEFAULT 1,
                provider VARCHAR(50) DEFAULT 'cora',
                environment VARCHAR(50) DEFAULT 'sandbox',
                client_id VARCHAR(255) NULL,
                pix_key VARCHAR(255) NULL,
                cert_pem TEXT NULL,
                key_pem TEXT NULL,
                webhook_url VARCHAR(255) NULL,
                active TINYINT(1) DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Verified pix_configs table');

        // 3. Run full sync alter
        await sequelize.sync({ alter: true });
        console.log('✓ Full sequelize sync completed successfully!');

        process.exit(0);
    } catch (err) {
        console.error('Sync Error:', err);
        process.exit(1);
    }
}

syncMissingColumns();
