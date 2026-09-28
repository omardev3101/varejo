const express = require('express');
const router = express.Router();
const StoreConfigController = require('../controllers/StoreConfigController');

// GET /api/storefront-config (Public endpoint for storefront and ERP)
router.get('/', StoreConfigController.getSettings);

// PUT /api/storefront-config (Protected endpoint for updating settings and banners)
router.put('/', StoreConfigController.updateSettings);

module.exports = router;
