const express = require('express');
const router = express.Router();
const FinancialController = require('../controllers/FinancialController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', FinancialController.list);
router.get('/reports', FinancialController.getAdvancedReports);
router.post('/', FinancialController.create);
router.patch('/:id/status', FinancialController.updateStatus);
router.get('/stats', FinancialController.getDashboardStats);

module.exports = router;
