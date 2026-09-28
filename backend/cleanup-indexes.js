const { sequelize } = require('./src/models');

async function cleanupTableIndexes(tableName, columnName) {
    try {
        console.log(`Buscando índices da tabela ${tableName}...`);
        const [results] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
        
        console.log(`Encontrados ${results.length} índices na tabela ${tableName}.`);
        
        const indexesToDrop = [];
        const seenKeyNames = new Set();
        let primaryOrFirstSeen = false;
        
        for (const index of results) {
            const keyName = index.Key_name;
            if (keyName === 'PRIMARY') continue;
            
            // Se o índice for relacionado à coluna que queremos limpar
            if (keyName.toLowerCase().includes(columnName) || keyName.toLowerCase().includes(`${tableName}_${columnName}`)) {
                if (seenKeyNames.has(keyName)) continue;
                seenKeyNames.add(keyName);
                
                // Mantemos o primeiro índice único, e removemos os subsequentes redundantes
                if (!primaryOrFirstSeen) {
                    primaryOrFirstSeen = true;
                    console.log(`Mantendo o índice inicial: ${keyName}`);
                } else {
                    indexesToDrop.push(keyName);
                }
            }
        }
        
        console.log(`Índices identificados para exclusão na tabela ${tableName}:`, indexesToDrop);
        
        // Excluir os índices extras
        for (const keyName of indexesToDrop) {
            try {
                console.log(`Excluindo índice ${keyName} da tabela ${tableName}...`);
                await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${keyName}\``);
                console.log(`Índice ${keyName} excluído.`);
            } catch (err) {
                console.error(`Erro ao excluir ${keyName} em ${tableName}:`, err.message);
            }
        }
    } catch (e) {
        console.error(`Erro ao limpar índices da tabela ${tableName}:`, e.message);
    }
}

async function run() {
    try {
        await cleanupTableIndexes('tenants', 'cnpj');
        await cleanupTableIndexes('users', 'email');
        await cleanupTableIndexes('orders', 'order');
        await cleanupTableIndexes('customers', 'cpf');
        await cleanupTableIndexes('products', 'barcode');
        await cleanupTableIndexes('sales', 'sale');
        console.log('Limpeza de todas as tabelas concluída!');
    } catch (e) {
        console.error('Erro geral no script:', e);
    }
    process.exit(0);
}

run();
