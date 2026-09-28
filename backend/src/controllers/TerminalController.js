const { Terminal, Tenant } = require('../models');

async function getTenantId(req) {
    if (req.tenantId) return req.tenantId;
    const firstTenant = await Tenant.findOne();
    return firstTenant ? firstTenant.id : null;
}

class TerminalController {
    async index(req, res) {
        try {
            const where = {};
            if (req.userRole === 'superadmin' || req.userRole === 'admin') {
                if (req.query.tenant_id) {
                    where.tenant_id = req.query.tenant_id;
                } else {
                    where.tenant_id = await getTenantId(req);
                }
            } else {
                where.tenant_id = await getTenantId(req);
            }

            let terminals = await Terminal.findAll({
                where,
                include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }],
                order: [['name', 'ASC']]
            });

            // Auto-create default terminal PDV 01 if unit has none
            if (terminals.length === 0 && where.tenant_id) {
                const newTerm = await Terminal.create({
                    name: 'PDV 01 - Caixa Principal',
                    tenant_id: where.tenant_id,
                    status: 'active'
                });
                terminals = [await Terminal.findByPk(newTerm.id, {
                    include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }]
                })];
            }

            return res.json(terminals);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async store(req, res) {
        try {
            const { name, status, tenant_id } = req.body;
            let tenantId = await getTenantId(req);
            if (req.userRole === 'superadmin' && tenant_id) {
                tenantId = tenant_id;
            }
            
            if (!tenantId) {
                return res.status(400).json({ error: 'Nenhum tenant cadastrado no sistema.' });
            }

            // Verifica se o terminal já existe para a unidade
            const existing = await Terminal.findOne({
                where: { tenant_id: tenantId, name }
            });

            if (existing) {
                return res.status(400).json({ error: 'Já existe um terminal com este nome nesta unidade' });
            }

            const terminal = await Terminal.create({
                tenant_id: tenantId,
                name,
                status: status || 'active'
            });

            return res.status(201).json(terminal);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, status, tenant_id } = req.body;
            let tenantId = await getTenantId(req);
            if (req.userRole === 'superadmin' && tenant_id) {
                tenantId = tenant_id;
            }

            const terminal = await Terminal.findOne({
                where: { id, tenant_id: tenantId }
            });

            if (!terminal) {
                return res.status(404).json({ error: 'Terminal não encontrado' });
            }

            if (name && name !== terminal.name) {
                const existing = await Terminal.findOne({
                    where: { tenant_id: tenantId, name }
                });
                if (existing) {
                    return res.status(400).json({ error: 'Já existe um terminal com este nome nesta unidade' });
                }
            }

            await terminal.update({ name, status });

            return res.json(terminal);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async destroy(req, res) {
        try {
            const { id } = req.params;
            const where = { id };
            if (req.userRole !== 'superadmin') {
                where.tenant_id = await getTenantId(req);
            }
            const terminal = await Terminal.findOne({ where });

            if (!terminal) {
                return res.status(404).json({ error: 'Terminal não encontrado' });
            }

            await terminal.destroy();
            return res.json({ message: 'Terminal removido com sucesso' });
        } catch (error) {
            return res.status(500).json({ error: 'Não foi possível remover o terminal, verifique se ele não possui movimentações.' });
        }
    }
}

module.exports = new TerminalController();
