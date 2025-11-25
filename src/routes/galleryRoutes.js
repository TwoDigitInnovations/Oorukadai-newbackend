const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes
router.get('/gallery', galleryController.getGallery);
router.get('/gallery/:id', galleryController.getGalleryById);

// Admin only routes
router.post('/gallery', authMiddleware(['admin']), galleryController.createGallery);
router.put('/gallery/:id', authMiddleware(['admin']), galleryController.updateGallery);
router.delete('/gallery/:id', authMiddleware(['admin']), galleryController.deleteGallery);

module.exports = router;
