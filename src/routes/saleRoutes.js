const express = require('express');

const authMiddleware = require('@middlewares/authMiddleware');
const FlashSale = require('@controllers/saleController');
const product = require('@controllers/productController');
const cron = require("node-cron");

const router = express.Router();

router.post(
    "/createSale",
    authMiddleware(["seller"]),
    FlashSale.createFlashSale
);

router.delete(
    "/deleteSale",
    authMiddleware(["seller"]),
    FlashSale.deleteFlashSale
);

router.get("/getFlashSale", FlashSale.getFlashSale);
router.get("/getOneFlashSalePerSeller", FlashSale.getOneFlashSalePerSeller);
router.get('/getFlashSaleBySlug/:slug', FlashSale.getFlashSaleBySlug);
router.get('/getSaleById/:id', authMiddleware(["seller", "admin"]), FlashSale.getSaleById);
router.post('/updateSale', authMiddleware(["seller", "admin"]), FlashSale.updateSale);

router.post(
    "/deleteFlashSaleProduct",
    authMiddleware(["seller"]),
    FlashSale.deleteFlashSaleProduct
);
router.get("/getProductbySale", product.getProductBySale);

cron.schedule("* * * * *", () => {
    FlashSale.endExpiredFlashSales();
});


module.exports = router;