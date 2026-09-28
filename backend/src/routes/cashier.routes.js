const express = require('express');
const router = express.Router();
const CashierController = require('../controllers/CashierController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/open', CashierController.openSession);
router.get('/active', CashierController.getActiveSession);
router.post('/:sessionId/transaction', CashierController.addTransaction);
router.post('/:sessionId/close', CashierController.closeSession);

module.exports = router;
