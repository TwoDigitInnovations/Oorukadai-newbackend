const express = require('express');
const aboutController = require('@controllers/aboutController');
const authMiddleware = require('@middlewares/authMiddleware');
const { upload } = require('@services/fileUpload');

const router = express.Router();

// Public route - Get About Page Data
router.get('/about', aboutController.getAboutPage);

// Admin routes - Update About Page
router.post('/about', authMiddleware(["admin"]), aboutController.updateAboutPage);
router.post('/about/hero', authMiddleware(["admin"]), aboutController.updateHeroSection);
router.post('/about/statistics', authMiddleware(["admin"]), aboutController.updateStatistics);
router.post('/about/team', authMiddleware(["admin"]), aboutController.updateTeamMembers);
router.post('/about/services', authMiddleware(["admin"]), aboutController.updateServices);
router.delete('/about', authMiddleware(["admin"]), aboutController.deleteAboutPage);

// Image upload routes
router.post('/about/upload-hero-image', authMiddleware(["admin"]), upload.single('heroImage'), aboutController.uploadHeroImage);
router.post('/about/upload-team-image', authMiddleware(["admin"]), upload.single('teamImage'), aboutController.uploadTeamImage);

module.exports = router;
