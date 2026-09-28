const { User, Tenant } = require('../models');
const jwt = require('jsonwebtoken');

class AuthController {
    async register(req, res) {
        try {
            const { tenantName, cnpj, userName, email, password } = req.body;

            // 1. Create Tenant
            const tenant = await Tenant.create({
                name: tenantName,
                cnpj
            });

            // 2. Create Admin User for this Tenant
            const user = await User.create({
                tenant_id: tenant.id,
                name: userName,
                email,
                password,
                role: 'admin'
            });

            return res.status(201).json({
                message: 'Tenant and Admin user created successfully',
                tenant: { id: tenant.id, name: tenant.name },
                user: { id: user.id, name: user.name, email: user.email }
            });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ 
                where: { email, active: true },
                include: [{ model: Tenant, as: 'tenant' }] // Optional: include tenant info
            });

            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { 
                    id: user.id, 
                    tenantId: user.tenant_id, 
                    stockTenantId: user.tenant?.shared_stock_tenant_id || user.tenant_id,
                    role: user.role 
                },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    tenant_id: user.tenant_id
                },
                token
            });
        } catch (error) {
            console.error('Login Error Stack:', error.stack);
            return res.status(500).json({ error: error.message });
        }
    }
    async customerLogin(req, res) {
        try {
            const { cpf, password } = req.body;
            // A senha para o cliente (associado) é o external_id
            const { Customer, Tenant } = require('../models');

            const customer = await Customer.findOne({ 
                where: { cpf, external_id: password, status: 'ativo' },
                include: [{ model: Tenant, as: 'tenant' }] 
            });

            if (!customer) {
                return res.status(401).json({ error: 'Credenciais inválidas ou cadastro inativo' });
            }

            const token = jwt.sign(
                { 
                    id: customer.id, 
                    tenantId: customer.tenant_id, 
                    stockTenantId: customer.tenant?.shared_stock_tenant_id || customer.tenant_id,
                    role: 'customer' 
                },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            return res.json({
                user: {
                    id: customer.id,
                    name: customer.name,
                    cpf: customer.cpf,
                    role: 'customer',
                    tenant_id: customer.tenant_id,
                    external_id: customer.external_id
                },
                token
            });
        } catch (error) {
            console.error('Customer Login Error Stack:', error.stack);
            return res.status(500).json({ error: error.message });
        }
    }

    async authorizeManager(req, res) {
        try {
            const { email, password } = req.body;
            
            const user = await User.findOne({ 
                where: { email, active: true },
                include: [{ model: require('../models').Role, as: 'role_rel' }]
            });

            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            if (user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'manager') {
                return res.status(403).json({ error: 'Usuário não tem perfil de gerente' });
            }

            if (user.role !== 'superadmin' && user.tenant_id !== req.tenantId) {
                return res.status(403).json({ error: 'Gerente pertence a outra unidade' });
            }

            return res.json({
                authorized: true,
                manager: {
                    id: user.id,
                    name: user.name,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Authorize Manager Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AuthController();
