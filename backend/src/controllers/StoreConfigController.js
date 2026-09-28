const { StoreConfig, Tenant } = require('../models');

const DEFAULT_BANNERS = [
    {
        id: 1,
        title: "Festival da Saúde VarejoPro",
        subtitle: "Até 50% OFF em Produtos Genéricos e Controlados com Entrega Rápida",
        badge: "FRETE GRÁTIS ACIMA DE R$ 50",
        image_url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=1200&auto=format&fit=crop&q=80",
        active: true
    },
    {
        id: 2,
        title: "Linha de Higiene & Cuidados",
        subtitle: "Shampoos, Desodorantes e Sabonetes com Desconto Exclusivo",
        badge: "OFERTAS DA SEMANA",
        image_url: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=1200&auto=format&fit=crop&q=80",
        active: true
    }
];

class StoreConfigController {
    async getSettings(req, res) {
        try {
            const reqTenantId = req.user?.tenant_id || 1;
            let tenant = await Tenant.findByPk(reqTenantId);
            if (!tenant) {
                tenant = await Tenant.findOne();
            }
            const tenantId = tenant ? tenant.id : 1;

            let config = await StoreConfig.findOne({ where: { tenant_id: tenantId } });

            if (!config) {
                config = await StoreConfig.create({
                    tenant_id: tenantId,
                    store_name: 'VarejoPro - Sua Loja Online',
                    slogan: 'Produtos, Higiene e Beleza com Entrega Rápida',
                    whatsapp: '(11) 99999-8888',
                    announcement_text: '🚚 Frete Grátis em compras acima de R$ 50,00 | 💊 Produtos com até 50% de Desconto',
                    free_shipping_min: 50.00,
                    opening_hours: 'Segunda a Sábado: 07:00 às 22:00 | Domingos: 08:00 às 18:00',
                    banners_json: DEFAULT_BANNERS
                });
            }

            return res.json(config);
        } catch (error) {
            console.error('Get Store Settings Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async updateSettings(req, res) {
        try {
            const reqTenantId = req.user?.tenant_id || 1;
            let tenant = await Tenant.findByPk(reqTenantId);
            if (!tenant) {
                tenant = await Tenant.findOne();
            }
            const tenantId = tenant ? tenant.id : 1;

            let config = await StoreConfig.findOne({ where: { tenant_id: tenantId } });

            const {
                store_name,
                slogan,
                whatsapp,
                announcement_text,
                free_shipping_min,
                opening_hours,
                logo_url,
                banners_json,
                allowed_sections_json
            } = req.body;

            const updateData = {};
            if (store_name !== undefined) updateData.store_name = store_name;
            if (slogan !== undefined) updateData.slogan = slogan;
            if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
            if (announcement_text !== undefined) updateData.announcement_text = announcement_text;
            if (free_shipping_min !== undefined) updateData.free_shipping_min = free_shipping_min;
            if (opening_hours !== undefined) updateData.opening_hours = opening_hours;
            if (logo_url !== undefined) updateData.logo_url = logo_url;
            if (banners_json !== undefined) updateData.banners_json = banners_json;
            if (allowed_sections_json !== undefined) updateData.allowed_sections_json = allowed_sections_json;

            if (!config) {
                config = await StoreConfig.create({
                    tenant_id: tenantId,
                    ...updateData
                });
            } else {
                await config.update(updateData);
            }

            return res.json({ success: true, config });
        } catch (error) {
            console.error('Update Store Settings Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new StoreConfigController();
