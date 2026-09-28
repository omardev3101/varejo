const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const authMiddleware = require('../middlewares/auth');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(authMiddleware);

router.get('/', ProductController.list);
router.post('/', ProductController.create);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);
router.get('/search-image', ProductController.searchWebImages);

// Image and Batch management
router.post('/:productId/batches', ProductController.addBatch);
router.post('/:productId/image', ProductController.uploadImage);
router.post('/:id/image', ProductController.uploadImage);

module.exports = router;
