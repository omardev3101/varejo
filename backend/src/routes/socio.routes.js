const express = require('express');
const router = express.Router();
const SocioController = require('../controllers/SocioController');
const jwt = require('jsonwebtoken');

// Socio Middleware
const socioAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Sessão de sócio expirada' });
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token malformatado' });
    }
    const [scheme, token] = parts;
    jwt.verify(token, process.env.JWT_SECRET || 'farma_bus_secret_key_2024', (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Sessão de sócio inválida' });
        }
        req.socioId = decoded.socioId;
        return next();
    });
};

// Public Routes for Storefront & Socio Portal
router.post('/check', SocioController.checkSocio);
router.post('/register', SocioController.completeProfileAndRegister);
router.post('/verify-email', SocioController.verifyEmailAndActivate);
router.post('/login', SocioController.login);
router.get('/products', SocioController.listPublicProducts);
router.get('/storefront-config', SocioController.getPublicStoreConfig);
router.post('/checkout-pix', SocioController.checkoutPix); // Public: Available to anyone (Socio or Non-Socio)
router.get('/order-status/:orderNumber', SocioController.getOrderStatus); // Public status polling

// Authenticated Routes for Socio Only
router.post('/checkout-payroll', socioAuthMiddleware, SocioController.checkoutPayroll);

module.exports = router;
