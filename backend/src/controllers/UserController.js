const { User, Role, Tenant } = require('../models');

class UserController {
    async list(req, res) {
        try {
            const whereClause = req.userRole === 'superadmin' ? {} : { tenant_id: req.tenantId };
            const users = await User.findAll({
                where: whereClause,
                include: [
                    { model: Role, as: 'role_rel', attributes: ['name'] },
                    { model: Tenant, as: 'tenant', attributes: ['name'] }
                ],
                attributes: { exclude: ['password'] }
            });
            return res.json(users);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const { name, email, password, role_id, role, tenant_id } = req.body;
            
            // Se for superadmin criando, pode definir um tenant ou deixar nulo
            let targetTenant = req.tenantId;
            if (req.userRole === 'superadmin') {
                targetTenant = tenant_id || null;
            }

            const user = await User.create({
                tenant_id: targetTenant,
                name,
                email,
                password,
                role_id: role_id || null,
                role: role || 'seller'
            });
            return res.status(201).json({ id: user.id, name: user.name, email: user.email });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, email, role_id, active, password, role, tenant_id } = req.body;

            const whereClause = req.userRole === 'superadmin' ? { id } : { id, tenant_id: req.tenantId };
            const user = await User.findOne({ where: whereClause });
            
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            const updateData = { name, email, role_id: role_id || null, active };
            if (password) updateData.password = password;
            if (req.userRole === 'superadmin') {
                if (role) updateData.role = role;
                if (tenant_id !== undefined) updateData.tenant_id = tenant_id || null;
            }

            await user.update(updateData);
            return res.json({ message: 'Usuário atualizado com sucesso' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new UserController();
