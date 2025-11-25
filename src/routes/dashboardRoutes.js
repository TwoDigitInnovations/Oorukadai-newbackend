const express = require('express');
const dashboard = require('@controllers/dashboard');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.get("/getDashboardStats", authMiddleware(["admin", "seller"]), dashboard.getDashboardData);
router.get("/getSalesStats", authMiddleware(["admin", "seller"]), dashboard.getMonthlyProductSales);
router.get("/getTopProductSales", authMiddleware(["admin", "seller"]), dashboard.getTopProductSales);
router.get("/getDailyTopSellingProduct", authMiddleware(["admin", "seller"]), dashboard.getDailyTopSellingProduct);

module.exports = router;