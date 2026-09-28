const express = require('express');
const router = express.Router();
const SalesController = require('../controllers/SalesController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/', SalesController.create);
router.get('/', SalesController.list);
router.get('/:id', SalesController.getSaleById);
router.post('/verify-manager', SalesController.verifyManager);
router.post('/:id/void', SalesController.voidSale);

module.exports = router;
