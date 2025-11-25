const express = require('express');
const content = require('@controllers/contentManagementController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();

// General content management routes
router.post('/content', authMiddleware(["admin"]), content.createContent);
router.get('/content', content.getContent);
router.post('/content/update', authMiddleware(["admin"]), content.updateContent);

// About page specific routes
router.post('/content/about', authMiddleware(["admin"]), content.updateAboutPage);
router.get('/content/about', content.getContent); // Same as getContent but we'll filter on frontend

module.exports = router;