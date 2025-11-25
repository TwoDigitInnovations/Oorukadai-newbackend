const express = require('express');
const product = require('@controllers/productController');
const authMiddleware = require('@middlewares/authMiddleware');
const { upload } = require('@services/fileUpload');

const router = express.Router();
router.post("/createProduct", 
    authMiddleware(["user", "admin", "seller"]), 
    upload.array('images', 10), 
    product.createProduct
);
router.post("/updateProduct", 
    authMiddleware(["user", "admin", "seller"]), 
    upload.array('images', 10),  
    product.updateProduct
);
router.get("/getProduct", product.getProduct);
router.get("/getSellerProducts", authMiddleware(["seller", "admin"]), product.getSellerProducts);
router.get("/getProductforseller", authMiddleware(["user", "admin", "seller", "employee"]), product.getProductforseller);
router.get("/getSponseredProduct", product.getSponseredProduct);
router.get("/getProductByslug/:id", product.getProductByslug);
router.get("/getProductById/:id", product.getProductById);
router.post("/compareProduct", product.compareProduct);
router.get("/getProductbycategory/:id", product.getProductbycategory);
router.get("/getProductBycategoryId", product.getProductBycategoryId);
router.get("/getProductBythemeId/:id", product.getProductBythemeId);
router.get("/getcolors", product.getColors);

router.get("/topselling", product.topselling);
router.get("/getnewitem", product.getnewitem);
router.delete("/deleteProduct/:id", authMiddleware(["user", "admin", "seller"]), product.deleteProduct);
router.post("/deleteAllProduct", authMiddleware(["user", "admin", "seller"]), product.deleteAllProduct);

// router.post("/createProductRequest", authMiddleware(["user", "admin", "seller", "employee"]), product.requestProduct);
router.post('/createProductRequest',authMiddleware(["user", "admin", "seller", "employee"]),product.createProductRequest)
router.get("/getTopSoldProduct", product.getTopSoldProduct);
router.get("/sellerWalletSummary", authMiddleware(["seller", "admin"]), product.getSellerWalletSummary);
router.get("/adminWalletSummary", authMiddleware(["admin"]), product.getAdminWalletSummary);

router.get("/getProductRquest", authMiddleware(["user", "admin", "seller", "employee"]), product.getrequestProduct);
router.patch("/refundProduct/:id", authMiddleware(["user", "admin", "seller", "employee"]), product.refundProduct);
router.post("/getOrderBySeller", authMiddleware(["user", "admin", "seller", "employee"]), product.getOrderBySeller);
router.post("/getSellerOrderByAdmin", authMiddleware(["admin"]), product.getSellerOrderByAdmin);
router.post("/getSellerReturnOrderByAdmin", authMiddleware(["admin", "seller",]), product.getSellerReturnOrderByAdmin);
router.get("/getSellerProductByAdmin", authMiddleware(["admin"]), product.getSellerProductByAdmin);
router.post("/getAssignedOrder", authMiddleware(["user", "admin", "seller", "employee"]), product.getAssignedOrder);
router.post("/cashcollected", authMiddleware(["user", "admin", "seller", "driver"]), product.cashcollected);
router.post("/changeorderstatus", authMiddleware(["user", "admin", "seller", "driver", "employee"]), product.changeorderstatus);
router.get("/onthewaytodelivery/:id", authMiddleware(["user", "admin", "seller", "driver"]), product.onthewaytodelivery);
router.get("/productsearch", product.productSearch);
router.post("/updateProductRequest/:id", authMiddleware(["user", "admin", "seller"]), product.updaterequestProduct);
router.get("/getProductRequest/:id", authMiddleware(["user", "admin", "seller", "driver", "employee"]), product.getrequestProductbyid);
router.post("/nearbyorderfordriver", authMiddleware(["driver"]), product.nearbyorderfordriver);
router.get("/acceptedorderfordriver", authMiddleware(["user", "admin", "seller", "driver"]), product.acceptedorderfordriver);
router.post("/acceptorderdriver/:id", authMiddleware(["user", "admin", "seller", "driver"]), product.acceptorderdriver);
router.get("/orderhistoryfordriver", authMiddleware(["user", "admin", "seller", "driver"]), product.orderhistoryfordriver);
router.get("/orderhistoryforvendor", authMiddleware(["user", "admin", "seller", "driver"]), product.orderhistoryforvendor);
router.get("/getProductRequestbyUser", authMiddleware(["user", "admin", "seller", "employee"]), product.getrequestProductbyuser);
router.get("/getAlluploadproduct", product.uploadProducts);
router.post("/suspend/:id", authMiddleware(["user", "admin", "seller"]), product.suspendProduct);
router.post("/updateProductStatus", authMiddleware(["admin", "seller"]), product.updateProductStatus);
router.post("/uploadImages", authMiddleware(["user", "admin", "seller"]), upload.array('images', 10), product.uploadImages);
router.get("/getdriveramount", product.getdriveramount);
router.get("/getdriverpendingamount/:id", product.getdriverpendingamount);
router.get("/collectcash/:id", authMiddleware(["user", "admin", "seller", "driver"]), product.collectcash);
router.post("/assignOrder", authMiddleware(["seller"]), product.assignOrderToEmployee);
router.post("/getOrderByEmployee", authMiddleware(["employee"]), product.getOrderByEmployee);
router.post("/getOrderHistoryByEmployee", authMiddleware(["employee"]), product.getOrderHistoryByEmployee);
router.post("/reminderSellerForReturn", authMiddleware(["admin"]), product.reminderSellerForReturn);

// Delivery label routes
router.post("/generate-delivery-label", authMiddleware(["admin", "seller"]), product.generateDeliveryLabel);
router.get("/:productId/delivery-label/print", authMiddleware(["admin", "seller"]), product.printDeliveryLabel);

module.exports = router;