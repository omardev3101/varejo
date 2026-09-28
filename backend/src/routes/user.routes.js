const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', UserController.list);
router.post('/', UserController.create);
router.put('/:id', UserController.update);

module.exports = router;
