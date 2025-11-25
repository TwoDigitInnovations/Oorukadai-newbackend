const express = require('express');

const authMiddleware = require('@middlewares/authMiddleware');
const { addProductReview, getProductReviews, getAllReviews } = require('@controllers/reviewController');

const router = express.Router();

router.post('/addreview',authMiddleware(["user", "admin", "seller"]),addProductReview)
router.get("/getProductReviews/:productId",getProductReviews)
router.get('/getAllReviews',authMiddleware(["user", "admin", "seller"]),getAllReviews)

module.exports = router;