const { Role } = require('../models');

class RoleController {
    async list(req, res) {
        try {
            const whereClause = req.userRole === 'superadmin' ? {} : { tenant_id: req.tenantId };
            const roles = await Role.findAll({ where: whereClause });
            return res.json(roles);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            let targetTenant = req.tenantId;
            if (req.userRole === 'superadmin' && req.body.tenant_id) {
                targetTenant = req.body.tenant_id;
            }

            const role = await Role.create({
                ...req.body,
                tenant_id: targetTenant
            });
            return res.status(201).json(role);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const whereClause = req.userRole === 'superadmin' ? { id } : { id, tenant_id: req.tenantId };
            const role = await Role.findOne({ where: whereClause });
            if (!role) return res.status(404).json({ error: 'Perfil não encontrado' });

            await role.update(req.body);
            return res.json(role);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const whereClause = req.userRole === 'superadmin' ? { id } : { id, tenant_id: req.tenantId };
            const role = await Role.findOne({ where: whereClause });
            if (!role) return res.status(404).json({ error: 'Perfil não encontrado' });

            await role.destroy();
            return res.json({ message: 'Perfil excluído com sucesso' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new RoleController();
