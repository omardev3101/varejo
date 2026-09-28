const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/InventoryController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/import-xml', InventoryController.importXML);
router.post('/preview-nfe', InventoryController.previewNfe);
router.post('/confirm-import', InventoryController.confirmImportNfe);
router.post('/search-nfe-key', InventoryController.searchAndImportNfeKey);
router.get('/imported-nfe-history', InventoryController.getImportedNfeHistory);
router.post('/clear-stock', InventoryController.clearStock);
router.get('/suppliers', InventoryController.listSuppliers);
router.get('/stock', InventoryController.getStockData);
router.get('/purchase-suggestions', InventoryController.getPurchaseSuggestions);

module.exports = router;
