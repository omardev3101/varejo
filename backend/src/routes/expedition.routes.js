const express = require('express');
const router = express.Router();
const ExpeditionController = require('../controllers/ExpeditionController');
const authMiddleware = require('../middlewares/auth');

router.get('/orders', authMiddleware, ExpeditionController.listOrders);
router.patch('/orders/:id/status', authMiddleware, ExpeditionController.updateStatus);
router.post('/orders/:id/confirm-pix', authMiddleware, ExpeditionController.confirmPixPayment);
router.post('/orders/:id/cancel', authMiddleware, ExpeditionController.cancelOrder);
router.get('/orders/:id/label', authMiddleware, ExpeditionController.getOrderLabel);

// This endpoint would be called by the Sindmotoristas platform
router.post('/external-order', ExpeditionController.createExternalOrder);

// Endpoint for Mobile App (authenticated)
router.post('/mobile-order', authMiddleware, ExpeditionController.createMobileOrder);
router.get('/my-orders', authMiddleware, ExpeditionController.getMyOrders);

module.exports = router;
