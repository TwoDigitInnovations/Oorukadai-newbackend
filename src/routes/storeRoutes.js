const express = require('express');
const store = require('@controllers/storeController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.post("/createStore", authMiddleware(["user", "admin", "seller"]), store.createStore);
router.get("/getStore", authMiddleware(["user", "admin", "seller"]), store.getStore);
router.get("/getStoreById/:id", store.getStoreById);
router.post("/updateStore", authMiddleware(["admin", "seller"]), store.updateStore);
router.delete("/deleteStore/:id", authMiddleware(["user", "admin", "seller"]), store.deleteStore);
router.post("/deleteAllStore", authMiddleware(["user", "admin", "seller"]), store.deleteAllStore);

module.exports = router;