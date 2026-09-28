const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const { exec } = require('child_process');
const sequelize = require('../config/database');

const BACKUP_DIR = path.join(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupService {
    /**
     * Pure Node.js SQL Dumper fallback when mysqldump is not available
     */
    static async dumpDatabasePureNode(outputPath) {
        const tablesQuery = await sequelize.query("SHOW TABLES", { type: sequelize.QueryTypes.SELECT });
        const dbName = process.env.DB_NAME || 'varejo';

        let sqlDump = `-- VarejoPro System Automated Backup\n`;
        sqlDump += `-- Date: ${new Date().toISOString()}\n`;
        sqlDump += `-- Database: ${dbName}\n\n`;
        sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        for (const tableObj of tablesQuery) {
            const tableName = Object.values(tableObj)[0];

            // Table Structure
            const [createTableResult] = await sequelize.query(`SHOW CREATE TABLE \`${tableName}\``);
            if (createTableResult && createTableResult[0]) {
                sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
                sqlDump += `${createTableResult[0]['Create Table']};\n\n`;
            }

            // Table Data
            const rows = await sequelize.query(`SELECT * FROM \`${tableName}\``, { type: sequelize.QueryTypes.SELECT });
            if (rows.length > 0) {
                sqlDump += `INSERT INTO \`${tableName}\` VALUES\n`;
                const valueRows = rows.map(row => {
                    const vals = Object.values(row).map(val => {
                        if (val === null || val === undefined) return 'NULL';
                        if (typeof val === 'number' || typeof val === 'boolean') return val;
                        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        if (Buffer.isBuffer(val)) return `0x${val.toString('hex')}`;
                        const str = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                        return `'${str}'`;
                    });
                    return `(${vals.join(', ')})`;
                });
                sqlDump += valueRows.join(',\n') + ';\n\n';
            }
        }

        sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        // Compress SQL to .gz
        const compressed = zlib.gzipSync(Buffer.from(sqlDump, 'utf-8'));
        fs.writeFileSync(outputPath, compressed);
        return outputPath;
    }

    /**
     * Executes database backup via mysqldump or Node fallback
     */
    static async createDatabaseBackup(type = 'auto') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `db_backup_${type}_${timestamp}.sql.gz`;
        const filePath = path.join(BACKUP_DIR, filename);

        const dbHost = process.env.DB_HOST || 'localhost';
        const dbUser = process.env.DB_USER || 'root';
        const dbPass = process.env.DB_PASS || '';
        const dbName = process.env.DB_NAME || 'varejo';

        return new Promise((resolve, reject) => {
            const passCmd = dbPass ? `-p"${dbPass}"` : '';
            const cmd = `mysqldump -h "${dbHost}" -u "${dbUser}" ${passCmd} --single-transaction --quick "${dbName}" | gzip > "${filePath}"`;

            exec(cmd, async (error) => {
                if (error) {
                    console.log('mysqldump não disponível ou falhou, utilizando dumper Node.js nativo...');
                    try {
                        await BackupService.dumpDatabasePureNode(filePath);
                        await BackupService.rotateBackups();
                        const stats = fs.statSync(filePath);
                        resolve({
                            filename,
                            filePath,
                            sizeBytes: stats.size,
                            sizeMB: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                            method: 'pure_node'
                        });
                    } catch (dumpErr) {
                        console.error('Erro no dumper Node.js nativo:', dumpErr);
                        reject(dumpErr);
                    }
                } else {
                    await BackupService.rotateBackups();
                    const stats = fs.statSync(filePath);
                    resolve({
                        filename,
                        filePath,
                        sizeBytes: stats.size,
                        sizeMB: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                        method: 'mysqldump'
                    });
                }
            });
        });
    }

    /**
     * Restores database state from a specified or latest valid backup file (.sql.gz)
     */
    static async restoreBackup(filename = null) {
        let targetFile = filename;

        if (!targetFile) {
            const backups = await BackupService.listBackups();
            if (backups.length === 0) {
                throw new Error('Nenhum backup válido encontrado no servidor.');
            }
            targetFile = backups[0].filename;
        }

        const safeName = path.basename(targetFile);
        const filePath = path.join(BACKUP_DIR, safeName);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo de backup não encontrado: ${safeName}`);
        }

        console.log(`⏳ Iniciando restauração do sistema a partir do backup: ${safeName}...`);

        const compressedBuffer = fs.readFileSync(filePath);
        let sqlContent;
        if (filePath.endsWith('.gz')) {
            sqlContent = zlib.gunzipSync(compressedBuffer).toString('utf-8');
        } else {
            sqlContent = compressedBuffer.toString('utf-8');
        }

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        const statements = sqlContent
            .split(/;\r?\n/)
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let executed = 0;
        for (const stmt of statements) {
            try {
                await sequelize.query(stmt);
                executed++;
            } catch (stmtErr) {
                if (!stmtErr.message.includes('Unknown table') && !stmtErr.message.includes('already exists')) {
                    console.warn(`Aviso na restauração: ${stmtErr.message}`);
                }
            }
        }

        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log(`✅ Restauração do sistema concluída! ${executed} instruções executadas.`);

        return {
            success: true,
            restoredFile: safeName,
            statementsExecuted: executed,
            timestamp: new Date()
        };
    }

    /**
     * Rotates old backups keeping only the latest 30 files
     */
    static async rotateBackups(maxFiles = 30) {
        try {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.startsWith('db_backup_') && f.endsWith('.sql.gz'))
                .map(f => ({
                    filename: f,
                    filePath: path.join(BACKUP_DIR, f),
                    mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length > maxFiles) {
                const toRemove = files.slice(maxFiles);
                toRemove.forEach(file => {
                    try {
                        fs.unlinkSync(file.filePath);
                        console.log(`🧹 Backup antigo removido para economizar espaço: ${file.filename}`);
                    } catch (e) {
                        console.error(`Erro ao remover backup antigo ${file.filename}:`, e.message);
                    }
                });
            }
        } catch (err) {
            console.error('Erro durante rotação de backups:', err.message);
        }
    }

    /**
     * Lists all backup files stored
     */
    static async listBackups() {
        if (!fs.existsSync(BACKUP_DIR)) return [];

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql.gz') || f.endsWith('.sql') || f.endsWith('.zip'))
            .map(f => {
                const stat = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    filename: f,
                    sizeBytes: stat.size,
                    sizeMB: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
                    createdAt: stat.birthtime || stat.mtime
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return files;
    }

    /**
     * Optimizes MySQL database tables to reclaim free disk space and rebuild indexes
     */
    static async optimizeDatabase() {
        try {
            const tables = await sequelize.query("SHOW TABLES", { type: sequelize.QueryTypes.SELECT });
            let count = 0;
            for (const tableObj of tables) {
                const tableName = Object.values(tableObj)[0];
                await sequelize.query(`OPTIMIZE TABLE \`${tableName}\``);
                count++;
            }
            if (global.gc) {
                global.gc();
            }
            return { success: true, tablesOptimized: count, timestamp: new Date() };
        } catch (error) {
            console.error('Erro na otimização de banco de dados:', error.message);
            throw error;
        }
    }

    /**
     * Gets real-time system health and resource consumption
     */
    static async getSystemHealth() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

        const processMemory = process.memoryUsage();
        const processRssMB = (processMemory.rss / (1024 * 1024)).toFixed(1);

        // Database size calculation
        let dbSizeMB = '0.00';
        try {
            const [sizeResult] = await sequelize.query(
                `SELECT SUM(data_length + index_length) / 1024 / 1024 AS size_mb FROM information_schema.TABLES WHERE table_schema = DATABASE()`
            );
            if (sizeResult && sizeResult[0] && sizeResult[0].size_mb) {
                dbSizeMB = parseFloat(sizeResult[0].size_mb).toFixed(2);
            }
        } catch (e) {
            console.error('Erro ao consultar tamanho do banco:', e.message);
        }

        const backups = await BackupService.listBackups();

        return {
            system: {
                platform: os.platform(),
                uptimeHours: (os.uptime() / 3600).toFixed(1),
                cpus: os.cpus().length,
                cpuLoad: os.loadavg ? os.loadavg() : [0, 0, 0]
            },
            memory: {
                totalMB: (totalMem / (1024 * 1024)).toFixed(0),
                freeMB: (freeMem / (1024 * 1024)).toFixed(0),
                usedPercent: `${memoryUsagePercent}%`,
                processRssMB: `${processRssMB} MB`
            },
            database: {
                name: process.env.DB_NAME || 'varejo',
                sizeMB: `${dbSizeMB} MB`
            },
            backups: {
                totalCount: backups.length,
                latestBackup: backups[0] || null
            }
        };
    }

    /**
     * Starts the automated 24-hour background scheduler
     */
    static startScheduler() {
        console.log('⏰ Servidor de Backup Automático e Monitoramento de Saúde ativado!');
        
        // Execute initial lightweight backup check after 30 seconds of app start
        setTimeout(async () => {
            try {
                const backups = await BackupService.listBackups();
                if (backups.length === 0) {
                    console.log('📦 Nenhum backup encontrado. Executando primeiro backup automático...');
                    await BackupService.createDatabaseBackup('auto_init');
                }
            } catch (err) {
                console.error('Erro no backup inicial:', err.message);
            }
        }, 30000);

        // Schedule daily automatic backup every 24 hours (86,400,000 ms)
        setInterval(async () => {
            try {
                console.log('⏰ Executando backup diário automático agendado...');
                await BackupService.createDatabaseBackup('auto_daily');
                await BackupService.optimizeDatabase();
            } catch (err) {
                console.error('Erro no backup diário agendado:', err.message);
            }
        }, 24 * 60 * 60 * 1000);
    }
}

module.exports = BackupService;
