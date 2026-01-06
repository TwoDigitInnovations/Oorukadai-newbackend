"use strict";
const router = require("express").Router();
const user = require("../../app/controller/user");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const optionalAuth = require("../../middlewares/optionalAuth");
const blog = require("../../app/controller/blogs");
const category = require("../../app/controller/category");
const product = require("../../app/controller/product");
const { upload } = require("../../app/services/fileUpload");
const { getStoreById } = require("../../app/controller/store");
const store = require("../../app/controller/store");
const favourite = require("../../app/controller/favourite");
const ContactUs = require("../../app/controller/feedback");
const flashSaleController = require("../../app/controller/sale");
const cron = require("node-cron");
const stripe = require("../../app/controller/Stripe");
const phonepe = require("../../app/controller/PhonePe");
const setting = require("../../app/controller/setting");
const shippingCostController = require("../../app/controller/ShippingCost");
const pincodeController = require("../../app/controller/pincodes");
const {
  createContent,
  getContent,
  updateContent,
} = require("../../app/controller/contentManagement");

const couponController = require("../../app/controller/coupan"); // Adjust the path as necessary
const TeamMember = require("../../app/controller/teammember");
const route = require("../../app/controller/route");
const notifications = require("../../app/controller/notifications");

router.post("/login", user.login);
router.post("/signUp", user.signUp);
router.post("/sendOTP", user.sendOTP);
router.post("/verifyOTP", user.verifyOTP);
router.post("/changePassword", user.changePassword);
router.post("/user/fileupload", upload.single("file"), user.fileUpload);

router.post(
  "/getuserlist",
  isAuthenticated(["ADMIN", "EMPLOYEE"]),
  user.getUserList
);

router.get(
  "/getDriverList",
  isAuthenticated(["USER", "ADMIN", "DRIVER"]),
  user.getDriverList
);
router.get(
  "/getVerifiedDriverList",
  isAuthenticated(["USER", "ADMIN", "DRIVER", "EMPLOYEE"]),
  user.getVerifiedDriverList
);

router.post("/updateStatus", isAuthenticated(["ADMIN"]), user.updateStatus);
router.get(
  "/getSellerList",
  isAuthenticated(["USER", "ADMIN"]),
  user.getSellerList
);

router.post(
  "/profile/changePassword",
  isAuthenticated(["USER", "ADMIN"]),
  user.changePasswordProfile
);

router.get(
  "/getProfile",
  isAuthenticated(["USER", "ADMIN", "DRIVER"]),
  user.getProfile
);
router.post(
  "/updateProfile",
  isAuthenticated(["USER", "ADMIN", "DRIVER"]),
  user.updateProfile
);

// Device registration routes for push notifications
router.post(
  "/registerDevice",
  isAuthenticated(["USER", "ADMIN", "DRIVER"]),
  user.registerDevice
);
router.get(
  "/getUserDevices",
  isAuthenticated(["USER", "ADMIN", "DRIVER"]),
  user.getUserDevices
);
router.post(
  "/removeDevice",
  isAuthenticated(["USER", "ADMIN", "DRIVER"]),
  user.removeDevice
);

router.post("/createEmployee", isAuthenticated(["ADMIN"]), user.createEmployee);
router.get("/getEmployee", isAuthenticated(["ADMIN"]), user.getEmployeeList);
router.post("/updateEmployee", isAuthenticated(["ADMIN"]), user.updateEmployee);
router.delete(
  "/deleteEmployee/:id",
  isAuthenticated(["ADMIN"]),
  user.deleteEmployee
);
router.get(
  "/getEmployeeById/:id",
  isAuthenticated(["ADMIN"]),
  user.getEmployeeById
);

//blogs
router.get("/getblogcategory", blog.getBloggCategory);
router.post(
  "/create-blog",
  // isAuthenticated(["USER", "ADMIN"]),
  blog.createBlog
);
router.get("/get-blog", blog.getBlog);
router.post(
  "/update-blog",
  isAuthenticated(["USER", "ADMIN"]),
  blog.updateBlog
);
router.post("/getBlogById", blog.getBlogById);
router.post("/getBlogByCategory", blog.getBlogByCategory);
router.delete(
  "/delete-blog",
  isAuthenticated(["USER", "ADMIN"]),
  blog.deleteBlog
);

//Category
router.get(
  "/getCategoryById/:id",
  // isAuthenticated(["USER", "ADMIN","EMPLOYEE"]),
  category.getCategoryById
);
router.post(
  "/createCategory",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  category.createCategory
);
router.get(
  "/getCategory",
  // isAuthenticated(["USER", "ADMIN","EMPLOYEE"]),
  category.getCategory
);
router.get(
  "/getPopularCategory",
  // isAuthenticated(["USER", "ADMIN","EMPLOYEE"]),
  category.getPopularCategory
);
router.post(
  "/updateCategory",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  category.updateCategory
);
router.delete(
  "/deleteCategory/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  category.deleteCategory
);
router.post(
  "/deleteAllCategory",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  category.deleteAllCategory
);

//settings
router.post(
  "/createsetting",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  setting.createSetting
);
router.get(
  "/getsetting",
  // isAuthenticated(["USER", "ADMIN","EMPLOYEE"]),
  setting.getSetting
);
router.post(
  "/updatesetting",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  setting.updateSetting
);

router.post(
  "/createTeamMember",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  TeamMember.createTeamMember
);

router.get("/getTeamMembers", TeamMember.getTeamMembers);
router.get("/getTeamMember/:id", TeamMember.getTeamMemberById);
router.post(
  "/updateTeamMember",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  TeamMember.updateTeamMember
);
router.delete(
  "/deleteTeamMember/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  TeamMember.deleteTeamMember
);
router.post("/bulkDeleteTeamMembers", TeamMember.bulkDeleteTeamMembers);

router.post(
  "/giverate",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  user.giverate
);
router.post("/getReview", user.getReview);
router.delete("/deleteReview/:id", user.deleteReview);

//Product
router.get("/getProductById/:id", product.getProductById);
router.get("/getProductByslug/:id", product.getProductByslug);
router.post("/compareProduct", product.compareProduct);
router.get("/getProductbycategory/:id", product.getProductbycategory);
router.get("/getProductBycategoryId", product.getProductBycategoryId);
router.get("/getTopSoldProduct", product.getTopSoldProduct);

router.post(
  "/createProduct",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.createProduct
);
router.get("/getProduct", product.getProduct);
router.get("/getBulkProduct", product.getBulkProduct);
router.get("/getNewArrival", product.getNewArrival);

router.get("/getBulkBuyProduct", product.getBulkBuyProduct);
router.get("/getProductbySale", product.getProductBySale);

router.get("/getSponseredProduct", product.getSponseredProduct);

router.post(
  "/updateProduct",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.updateProduct
);

router.get(
  "/topselling",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.topselling
);

router.get(
  "/getnewitem",
  isAuthenticated(["USER", "ADMIN"]),
  product.getnewitem
);

router.get("/getcolors", isAuthenticated(["USER", "ADMIN"]), product.getColors);

router.delete(
  "/deleteProduct/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.deleteProduct
);

router.post(
  "/deleteAllProduct",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.deleteAllProduct
);
router.post(
  "/toggleProductStatus/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.toggleProductStatus
);

router.get("/getStoreById/:id", store.getStoreById);
router.post(
  "/createStore",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  store.createStore
);
router.get("/getStore", isAuthenticated(["USER", "ADMIN"]), store.getStore);
router.post("/updateStore", isAuthenticated(["ADMIN"]), store.updateStore);

router.delete(
  "/deleteStore/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  store.deleteStore
);
router.post(
  "/deleteAllStore",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  store.deleteAllStore
);

// product request
router.post(
  "/createProductRquest",
  optionalAuth, // Allow both authenticated and guest users
  product.requestProduct
);

router.post(
  "/New-createProductRquest",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.newRequestProduct
);

router.post(
  "/SetProductPosition",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.setProductPosition
);

router.post(
  "/BulkMessage",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  user.sendMessageToAllCustomer
);

router.post(
  "/updateProductRequest",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.updateProductRequest
);

router.get(
  "/getProductRquest",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.getrequestProduct
);

router.get(
  "/getStatusCompletedProducts",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.getStatusCompletedProducts
);

router.post(
  "/getOrderBySeller",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.getOrderBySeller
);

router.post(
  "/NewgetOrderBySeller",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.NewgetOrderBySeller
);

router.post(
  "/FailedOrder",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.FailedOrder
);

router.post(
  "/getAssignedOrder",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.getAssignedOrder
);

router.post(
  "/changeorderstatus",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.changeorderstatus
);
router.post(
  "/verifyOrderStatusWithCode",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.verifyOrderStatusWithCode
);

router.post(
  "/AddNote",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.AddNote
);

router.get("/productsearch", product.productSearch);
router.get("/updateProductImages", product.updateProductImages);

router.post(
  "/updateProductRequest/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.updaterequestProduct
);

router.get(
  "/getProductRequest/:id",
  isAuthenticated(["USER", "ADMIN", "DRIVER", "EMPLOYEE"]),
  product.getrequestProductbyid
);

router.get(
  "/getProductRequestbyUser",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.getrequestProductbyuser
);

router.get(
  "/NewgetrequestProductbyuser",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.NewgetrequestProductbyuser
);

// Guest order tracking
router.post(
  "/trackGuestOrder",
  product.trackGuestOrder
);

router.post(
  "/nearbyorderfordriver",
  isAuthenticated(["USER", "ADMIN", "DRIVER"]),
  product.nearbyorderfordriver
);

//Favourite

router.post(
  "/addremovefavourite",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  favourite.AddFavourite
);

router.get(
  "/getFavourite",
  // isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  favourite.getFavourite
);

router.post(
  "/uploadAllproduct",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.uploadProducts
);
router.get(
  "/getLowStockProduct",
  // isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.getLowStockProduct
);

router.get("/getAlluploadproduct", product.uploadProducts);

router.post("/createFeedback", ContactUs.createFeedback);
router.post(
  "/getAllFeedback",
  // isAuthenticated(["USER", "ADMIN", "SELLER"]),
  ContactUs.getAllFeedback
);
router.post("/updateContactStatus", ContactUs.updateStatus);
router.post(
  "/createSale",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.createFlashSale
);
router.get(
  "/getFlashSale",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.getFlashSale
);
router.get("/getActiveFlashSales", flashSaleController.getActiveFlashSales);
router.get(
  "/getFlashSaleByProduct/:productId",
  flashSaleController.getFlashSaleByProduct
);
router.put(
  "/updateFlashSale/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.updateFlashSale
);
router.put(
  "/toggleFlashSaleStatus/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.toggleFlashSaleStatus
);
router.delete(
  "/deleteFlashSale/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.deleteFlashSale
);
router.delete(
  "/deleteAllFlashSales",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.deleteAllFlashSales
);
router.delete(
  "/deleteSale",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.deleteAllFlashSales
);
router.post(
  "/deleteFlashSaleProduct",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  flashSaleController.deleteFlashSale
);

router.post(
  "/poststripe",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.poststripe
);
router.post(
  "/createPayment",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.createPayment
);
router.post(
  "/create-checkout-session",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.createCheckout
);
router.post(
  "/retrieve-checkout-session",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.retrieveCheckout
);
router.post(
  "/test-tax-calculation",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.testTaxCalculation
);
router.post(
  "/orderreadyNotification",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  user.orderreadyNotification
);
router.post("/getSecrectCode", product.getSecrectCode);
router.post("/updateTrackingInfo", product.updateTrackingInfo);

router.post(
  "/cancalOrder",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.cancalOrder
);

router.post(
  "/cancalOrderfromAdmin",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.cancalOrderfromAdmin
);

router.post(
  "/switchToShipment",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.switchToShipment
);

router.post(
  "/RequestForReturn",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.RequestForReturn
);

router.post(
  "/ReturnConform",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  product.ReturnConform
);

router.post("/suspendUser", isAuthenticated(["ADMIN"]), user.suspendUser);

router.post(
  "/addShippingCost",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  shippingCostController.addShippingCost
);

router.get(
  "/getShippingCost",
  // isAuthenticated(["USER", "ADMIN","EMPLOYEE"]),
  shippingCostController.getShippingCost
);

router.post(
  "/updateShippingCost",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  shippingCostController.updateShippingCost
);

router.post(
  "/addPinCode",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  pincodeController.addPincode
);

router.get("/getPinCode", pincodeController.getAllPincodes);

router.delete(
  "/deletePinCode/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  pincodeController.deletePincode
);

router.post("/checkAvailable", pincodeController.checkPincodeAvailability);

router.post(
  "/content",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  createContent
);

router.get(
  "/content",
  // isAuthenticated(["USER", "ADMIN", "SELLER"]),
  getContent
);

router.post(
  "/content/update",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  updateContent
);

router.post(
  "/sendmessage",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  user.sendMessageToCustomer
);

router.post(
  "/AddCoupon",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  couponController.AddCoupon
);

router.get("/GetAllCoupons", couponController.GetAllCoupons);

router.post(
  "/validateCoupon",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  couponController.ValidateCoupon
);

router.get(
  "/getCoupanbyId/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  couponController.GetCouponById
);

router.post(
  "/updateCoupan/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  couponController.UpdateCoupon
);
router.post(
  "/ValidateCouponforUser",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  couponController.ValidateCouponforUser
);

router.delete(
  "/deleteCoupan/:id",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  couponController.DeleteCoupon
);

router.post("/getCustomerDashboard", user.getCustomerDashboard);

router.post("/getAllCustomersStats", user.getAllCustomersStats);

router.post("/getCustomerOrderHistory", user.getCustomerOrderHistory);
router.get(
  "/orderhistoryfordriver",
  isAuthenticated(["USER", "ADMIN", "DRIVER", "SELLER"]),
  product.orderhistoryfordriver
);
router.get(
  "/acceptedorderfordriver",
  isAuthenticated(["USER", "ADMIN", "DRIVER", "SELLER"]),
  product.acceptedorderfordriver
);
router.post(
  "/getOrderHistoryByAdmin",
  isAuthenticated(["ADMIN"]),
  product.getOrderHistoryByAdmin
);
router.post(
  "/getPendingOrdersByAdmin",
  isAuthenticated(["ADMIN"]),
  product.getPendingOrdersByAdmin
);
router.post("/createinvoice", product.createPdf);
router.post(
  "/assignDriver",
  isAuthenticated(["ADMIN", "EMPLOYEE"]),
  product.assignDriver
);
router.post(
  "/markOrderAsDelivered",
  isAuthenticated(["ADMIN"]),
  product.markOrderAsDelivered
);
router.post(
  "/submitProofOfDelivery",
  isAuthenticated(["ADMIN", "DRIVER"]),
  product.submitProofOfDelivery
);
router.post(
  "/markOrderAsPreparing",
  isAuthenticated(["ADMIN", "DRIVER"]),
  product.markOrderAsPreparing
);
router.post(
  "/acceptorderdriver/:id",
  isAuthenticated(["USER", "ADMIN", "DRIVER", "SELLER"]),
  product.acceptorderdriver
);

// Route management routes
router.post(
  "/optimize-route",
  isAuthenticated(["USER", "ADMIN", "DRIVER", "SELLER"]),
  route.getOptimizedRoute
);
router.get("/dashboarddetails", product.dashboarddetails);
router.get("/getMonthlySales", product.getMonthlySales);

// Notifications
router.get(
  "/getnotification",
  isAuthenticated(["USER", "ADMIN", "DRIVER", "SELLER"]),
  notifications.getNotification
);

// test api
router.post("/test-notification", user.testNotification);

cron.schedule("*/30 * * * * *", () => {
  flashSaleController.DeleteExpiredCoupons();
});
router.post("/changePasswordFOrAdmin", user.changePasswordFOrAdmin);
router.get("/changeBase64", user.changeBase64);

router.get("/downloadProductsExcel", product.downloadProductsExcel);
router.get("/downloadCustomerExcel", user.downloadCustomerExcel);

// sendgrid
// router.get('/send/sendMessageViaSendGrid', user.sendMessageViaSendGrid)
// router.get('/send/sendMessageViaSendGridTemplate', user.sendMessageViaSendGridTemplate)

router.post(
  "/cancel-checkout-session",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.CancelCheckout
);
router.post(
  "/updatePaymentSatusBySeller",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.updatePaymentSatusBySeller
);
router.post(
  "/new-retrieve-checkout-session",
  isAuthenticated(["USER", "ADMIN", "EMPLOYEE"]),
  stripe.NewRetrieveCheckout
);

// PhonePe Payment Routes
router.post(
  "/phonepe-initiate",
  optionalAuth,
  phonepe.initiatePhonePePayment
);
router.post(
  "/phonepe-status",
  optionalAuth,
  phonepe.checkPhonePeStatus
);
router.post(
  "/phonepe-callback",
  phonepe.phonePeCallback
);
router.post(
  "/phonepe-cancel",
  optionalAuth,
  phonepe.cancelPhonePePayment
);

module.exports = router;
