const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/CustomerController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', CustomerController.list);
router.get('/purchase-report', CustomerController.getPurchaseReport);
router.post('/', CustomerController.create);
router.put('/:id', CustomerController.update);
router.delete('/:id', CustomerController.delete);

// External Integration
router.post('/import', CustomerController.importExternal);
router.post('/import-spreadsheet', CustomerController.importSpreadsheet);

module.exports = router;
