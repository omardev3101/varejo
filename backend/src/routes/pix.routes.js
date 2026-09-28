const express = require('express');
const router = express.Router();
const PixConfigController = require('../controllers/PixConfigController');
const authMiddleware = require('../middlewares/auth');

// Protected admin endpoints
router.get('/config', authMiddleware, PixConfigController.getConfig);
router.put('/config', authMiddleware, PixConfigController.updateConfig);
router.post('/test-connection', authMiddleware, PixConfigController.testConnection);

// Public webhook endpoint for Banco Cora callback
router.post('/webhook/cora', PixConfigController.handleCoraWebhook);

module.exports = router;
