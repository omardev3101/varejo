const express = require('express');
const router = express.Router();
const FiscalController = require('../controllers/FiscalController');
const authMiddleware = require('../middlewares/auth');

const ExportController = require('../controllers/ExportController');

router.use((req, res, next) => {
    console.log('Fiscal Router Reached:', req.method, req.url);
    next();
});

// router.use(authMiddleware);

router.post('/:saleId/emit', FiscalController.emitNFCe);
router.post('/:saleId/emit-contingency', FiscalController.emitContingencyNFCe);
router.post('/sync-contingency', FiscalController.syncContingencies);
router.get('/notes', FiscalController.getAllFiscalNotes);
router.get('/test', (req, res) => res.json({ ok: true, message: 'Fiscal Routes Loaded' }));
router.get('/:saleId/data', FiscalController.getFiscalData);
router.get('/export', ExportController.exportData);

module.exports = router;
