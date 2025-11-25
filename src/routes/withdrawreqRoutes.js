const express = require('express');
const withdrawreq = require('@controllers/withdrawreq');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.post("/createWithdrawreq", authMiddleware(["user", "admin", "seller", "driver"]), withdrawreq.createWithdrawreq);
router.get("/getWithdrawreq", authMiddleware(["user", "admin", "seller", "driver"]), withdrawreq.getWithdrawreq);
// Get withdrawals by seller ID (optional parameter)
router.get("/getWithdrawreqbyseller", authMiddleware(["user", "admin", "seller", "driver"]), withdrawreq.getWithdrawreqbyseller);
router.get("/getWithdrawreqbyseller/:id", authMiddleware(["user", "admin", "seller", "driver"]), withdrawreq.getWithdrawreqbyseller);
router.post("/updateWithdrawreq", authMiddleware(["user", "admin", "seller", "driver"]), withdrawreq.updateWithdrawreq);
// Get all withdrawals for admin with pagination and filtering
router.get("/getAllWithdrawals", authMiddleware(["admin"]), withdrawreq.getAllWithdrawals);

module.exports = router;