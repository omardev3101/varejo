const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/auth');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/customer-login', AuthController.customerLogin);
router.post('/authorize-manager', authMiddleware, AuthController.authorizeManager);

module.exports = router;
