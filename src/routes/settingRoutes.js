const express = require('express');
const setting = require('@controllers/settingController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.post("/createsetting", setting.createSetting);
router.get("/getsetting", setting.getSetting);
router.post("/updatesetting", setting.updateSetting);
router.post("/createDeliveryCharge", authMiddleware(["admin"]), setting.addDeliveryCharge);
router.post("/createDeliveryPartnerTip", authMiddleware(["admin"]), setting.addDeliveryPartnerTips);
router.delete("/deleteDeliveryTip", authMiddleware(["admin"]), setting.deleteDeliveryPartnerTips);
router.get("/getDeliveryCharge", setting.getDeliveryCharge);
router.get("/getDeliveryPartnerTip", setting.getDeliveryPartnerTips);

module.exports = router;