const express = require('express');
const notification = require('@controllers/notificationController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.get("/getnotification", authMiddleware(["user", "admin", "seller"]), notification.getnotification);
router.post("/sendNotification", authMiddleware(["user", "admin", "seller"]), notification.sendNotification);

module.exports = router;