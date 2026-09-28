const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token error' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token malformatted' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token invalid' });
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;

        let tenantId = req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id'], 10) : decoded.tenantId;
        let stockTenantId = decoded.stockTenantId || tenantId;

        // Check if user currently has an active open cashier session
        try {
            const { CashierSession } = require('../models');
            const activeSession = await CashierSession.findOne({
                where: { user_id: decoded.id, status: 'open' }
            });
            if (activeSession) {
                tenantId = activeSession.tenant_id;
                stockTenantId = activeSession.tenant_id;
            }
        } catch (sessionErr) {
            // ignore session check error
        }

        // Fallback for superadmin / admin without tenant scope to prevent database querying errors
        if (!tenantId && (decoded.role === 'superadmin' || decoded.role === 'admin')) {
            try {
                const { Tenant } = require('../models');
                const firstTenant = await Tenant.findOne();
                if (firstTenant) {
                    tenantId = firstTenant.id;
                    stockTenantId = firstTenant.shared_stock_tenant_id || firstTenant.id;
                }
            } catch (dbErr) {
                console.error('Auth Middleware Tenant Fallback Error:', dbErr);
            }
        }

        req.tenantId = tenantId;
        req.stockTenantId = stockTenantId;
        
        return next();
    });
};

module.exports = authMiddleware;
