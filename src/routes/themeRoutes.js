const express = require('express');
const theme = require('@controllers/themeController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.get("/getThemeById/:id", theme.getThemeById);
router.post("/createTheme", authMiddleware(["user", "admin", "seller"]), theme.createTheme);
router.get("/getTheme", theme.getTheme);
router.post("/updateTheme", authMiddleware(["user", "admin", "seller"]), theme.updateTheme);
router.delete("/deleteTheme/:id", authMiddleware(["user", "admin", "seller"]), theme.deleteTheme);
router.post("/deleteAllCategory", authMiddleware(["user", "admin", "seller"]), theme.deleteAllTheme);

module.exports = router;