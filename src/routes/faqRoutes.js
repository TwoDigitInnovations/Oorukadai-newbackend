const express = require('express');
const faq = require('@controllers/faqController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.get('/faq', faq.getFaqs);
router.post('/faq', authMiddleware(["user", "admin", "seller"]), faq.createFaq);
router.post('/updatefaq/:id', authMiddleware(["user", "admin", "seller"]), faq.updateFaq);
router.delete('/deletefaq/:id', authMiddleware(["user", "admin", "seller"]), faq.deleteFaq);

module.exports = router;