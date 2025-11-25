const express = require('express');
const category = require('@controllers/categoryController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.get("/getCategoryById/:id", category.getCategoryById);
router.post("/createCategory", authMiddleware(["user", "admin", "seller"]), category.createCategory);
router.get("/getCategory", category.getCategory);
router.get("/getPopularCategory", category.getPopularCategory);
router.post("/updateCategory", authMiddleware(["user", "admin", "seller"]), category.updateCategory);
router.delete("/deleteCategory/:id", authMiddleware(["user", "admin", "seller"]), category.deleteCategory);
router.post("/deleteAllCategory", authMiddleware(["user", "admin", "seller"]), category.deleteAllCategory);

module.exports = router;