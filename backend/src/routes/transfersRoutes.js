const express = require('express');
const router = express.Router();
const TransfersController = require('../controllers/TransfersController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', TransfersController.listTransfers);
router.post('/', TransfersController.createTransfer);
router.post('/:transferId/receive', TransfersController.receiveTransfer);
router.post('/:transferId/emit-nf', TransfersController.emitTransferNF);

module.exports = router;
