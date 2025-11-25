const express = require('express');
const timeslot = require('@controllers/timeController');
const authMiddleware = require('@middlewares/authMiddleware');

const router = express.Router();
router.post("/create-timeslot", authMiddleware(["admin"]), timeslot.createTimeSlot);
router.get("/get-timeslot", timeslot.getAllTimeSlots);
router.delete("/delete-timeslot/:id", authMiddleware(["admin"]), timeslot.deleteTimeSlot);
router.patch("/update-timeslot/:id", authMiddleware(["admin"]), timeslot.updateTimeSlot);

module.exports = router;