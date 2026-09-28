const { Tenant, Sale, FinancialEntry, sequelize } = require('../models');
const { Op } = require('sequelize');

class TenantController {
    async getAll(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Get all tenants
            const tenants = await Tenant.findAll({
                order: [['name', 'ASC']]
            });

            // For dashboard integration, calculate sales and debt per tenant
            const tenantsWithStats = await Promise.all(tenants.map(async (tenant) => {
                const todaySales = await Sale.sum('final_amount', {
                    where: { 
                        tenant_id: tenant.id,
                        status: 'completed',
                        created_at: { [Op.gte]: today }
                    }
                }) || 0;

                const pendingDebt = await FinancialEntry.sum('amount', {
                    where: { 
                        tenant_id: tenant.id,
                        type: 'receivable',
                        category: 'Venda Convênio',
                        status: 'pending'
                    }
                }) || 0;

                return {
                    ...tenant.toJSON(),
                    todaySales,
                    pendingDebt
                };
            }));

            return res.json(tenantsWithStats);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const { cnpj } = req.body;

            // Check CNPJ
            const existing = await Tenant.findOne({ where: { cnpj } });
            if (existing) {
                return res.status(400).json({ error: 'Já existe uma loja cadastrada com este CNPJ' });
            }

            const tenant = await Tenant.create({
                ...req.body,
                status: req.body.status || 'active',
                default_min_stock: req.body.default_min_stock || 5,
                shared_stock_tenant_id: req.body.shared_stock_tenant_id || null
            });

            return res.status(201).json(tenant);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { cnpj } = req.body;

            const tenant = await Tenant.findByPk(id);
            if (!tenant) {
                return res.status(404).json({ error: 'Loja não encontrada' });
            }

            // Check CNPJ if changed
            if (cnpj && cnpj !== tenant.cnpj) {
                const existing = await Tenant.findOne({ where: { cnpj } });
                if (existing) {
                    return res.status(400).json({ error: 'Este CNPJ já está sendo usado por outra loja' });
                }
            }

            await tenant.update({
                ...req.body,
                shared_stock_tenant_id: req.body.shared_stock_tenant_id || null
            });

            return res.json(tenant);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const tenant = await Tenant.findByPk(id);
            if (!tenant) {
                return res.status(404).json({ error: 'Loja não encontrada' });
            }

            // For safety, instead of hard delete, maybe just deactivate.
            await tenant.update({ status: 'inactive' });

            return res.json({ message: 'Loja inativada com sucesso' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new TenantController();
