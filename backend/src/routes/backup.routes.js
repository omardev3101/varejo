const express = require('express');
const router = express.Router();
const BackupController = require('../controllers/BackupController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/status', (req, res) => BackupController.getStatus(req, res));
router.get('/list', (req, res) => BackupController.listBackups(req, res));
router.post('/create', (req, res) => BackupController.createBackup(req, res));
router.post('/optimize', (req, res) => BackupController.optimizeSystem(req, res));
router.post('/restore-latest', (req, res) => BackupController.restoreLatest(req, res));
router.post('/restore/:filename', (req, res) => BackupController.restoreSpecific(req, res));
router.get('/download/:filename', (req, res) => BackupController.downloadBackup(req, res));

module.exports = router;
