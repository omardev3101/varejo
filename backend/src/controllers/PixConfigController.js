const { PixConfig } = require('../models');
const coraPixService = require('../services/CoraPixService');

class PixConfigController {
    async getConfig(req, res) {
        try {
            const tenantId = req.user?.tenant_id || 1;
            let config = await PixConfig.findOne({ where: { tenant_id: tenantId } });

            if (!config) {
                config = await PixConfig.create({
                    tenant_id: tenantId,
                    provider: 'cora',
                    environment: 'sandbox',
                    client_id: '',
                    pix_key: '',
                    cert_pem: '',
                    key_pem: '',
                    active: false
                });
            }

            return res.json(config);
        } catch (error) {
            console.error('Get Pix Config Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async updateConfig(req, res) {
        try {
            const tenantId = req.user?.tenant_id || 1;
            let config = await PixConfig.findOne({ where: { tenant_id: tenantId } });

            const {
                provider,
                environment,
                client_id,
                pix_key,
                cert_pem,
                key_pem,
                webhook_url,
                active
            } = req.body;

            const updateData = {};
            if (provider !== undefined) updateData.provider = provider;
            if (environment !== undefined) updateData.environment = environment;
            if (client_id !== undefined) updateData.client_id = client_id;
            if (pix_key !== undefined) updateData.pix_key = pix_key;
            if (cert_pem !== undefined) updateData.cert_pem = cert_pem;
            if (key_pem !== undefined) updateData.key_pem = key_pem;
            if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
            if (active !== undefined) updateData.active = active;

            if (!config) {
                config = await PixConfig.create({
                    tenant_id: tenantId,
                    ...updateData
                });
            } else {
                await config.update(updateData);
            }

            return res.json({ success: true, config });
        } catch (error) {
            console.error('Update Pix Config Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async testConnection(req, res) {
        try {
            const tenantId = req.user?.tenant_id || 1;
            const config = await PixConfig.findOne({ where: { tenant_id: tenantId } });
            if (!config || !config.client_id || !config.cert_pem || !config.key_pem) {
                return res.status(400).json({ error: 'Preencha o Client ID, Certificado Público (.pem) e Chave Privada (.key) para testar a conexão mTLS com a Cora.' });
            }

            const result = await coraPixService.testConnection(config);
            return res.json(result);
        } catch (error) {
            console.error('Test Cora Connection Error:', error);
            return res.status(400).json({ error: error.message });
        }
    }

    async handleCoraWebhook(req, res) {
        try {
            await coraPixService.processWebhookNotification(req.body);
            return res.status(200).json({ status: 'OK' });
        } catch (error) {
            console.error('Cora Webhook Route Error:', error);
            return res.status(200).json({ status: 'ERROR_HANDLED', error: error.message });
        }
    }
}

module.exports = new PixConfigController();
