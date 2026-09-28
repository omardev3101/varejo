const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/stats', AdminController.getGlobalStats);

module.exports = router;
