const path = require('path');
const fs = require('fs');
const BackupService = require('../services/BackupService');

class BackupController {
    async getStatus(req, res) {
        try {
            const health = await BackupService.getSystemHealth();
            return res.json(health);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async listBackups(req, res) {
        try {
            const backups = await BackupService.listBackups();
            return res.json(backups);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async createBackup(req, res) {
        try {
            const result = await BackupService.createDatabaseBackup('manual');
            return res.status(201).json({
                message: 'Backup do banco de dados criado com sucesso!',
                backup: result
            });
        } catch (error) {
            console.error('Erro ao criar backup manual:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async optimizeSystem(req, res) {
        try {
            const result = await BackupService.optimizeDatabase();
            return res.json({
                message: 'Otimização do banco de dados e liberação de memória concluídas com sucesso!',
                result
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async downloadBackup(req, res) {
        try {
            const { filename } = req.params;
            const safeName = path.basename(filename);
            const backupDir = path.join(__dirname, '../../backups');
            const filePath = path.join(backupDir, safeName);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Arquivo de backup não encontrado' });
            }

            return res.download(filePath, safeName);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async restoreLatest(req, res) {
        try {
            const result = await BackupService.restoreBackup(null);
            return res.json({
                message: `Sistema restaurado com sucesso a partir do último backup válido (${result.restoredFile})!`,
                result
            });
        } catch (error) {
            console.error('Erro ao restaurar último backup:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async restoreSpecific(req, res) {
        try {
            const { filename } = req.params;
            const result = await BackupService.restoreBackup(filename);
            return res.json({
                message: `Sistema restaurado com sucesso a partir do backup (${result.restoredFile})!`,
                result
            });
        } catch (error) {
            console.error('Erro ao restaurar backup específico:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new BackupController();
