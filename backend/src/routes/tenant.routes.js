const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/TenantController');

// Somente admins (idealmente) acessam o gerenciamento de tenants
router.get('/', TenantController.getAll);
router.post('/', TenantController.create);
router.put('/:id', TenantController.update);
router.delete('/:id', TenantController.delete);

module.exports = router;
