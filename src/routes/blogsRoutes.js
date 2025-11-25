const express = require('express');
const blog = require('@controllers/blogsController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.get("/getBloggCategory", blog.getBloggCategory);
router.post("/create-blog", authMiddleware(["user", "admin", "seller"]), blog.createBlog);
router.get("/get-blog", blog.getBlog);
router.post("/update-blog", authMiddleware(["user", "admin", "seller"]), blog.updateBlog);
router.post("/getBlogById", blog.getBlogById);
router.post("/getBlogByCategory", blog.getBlogByCategory);
router.delete("/delete-blog", authMiddleware(["user", "admin", "seller"]), blog.deleteBlog);

module.exports = router;