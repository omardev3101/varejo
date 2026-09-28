const express = require('express');
const router = express.Router();
const TerminalController = require('../controllers/TerminalController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', TerminalController.index);
router.post('/', TerminalController.store);
router.put('/:id', TerminalController.update);
router.delete('/:id', TerminalController.destroy);

module.exports = router;
