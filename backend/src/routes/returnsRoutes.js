const express = require('express');
const router = express.Router();
const ReturnsController = require('../controllers/ReturnsController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', ReturnsController.listReturns);
router.post('/', ReturnsController.createReturn);
router.post('/:returnId/emit-nf', ReturnsController.emitReturnNF);
router.post('/:returnId/emit-contingency', ReturnsController.emitContingencyNF);
router.post('/:returnId/sync-contingency', ReturnsController.syncContingencyNF);

module.exports = router;
