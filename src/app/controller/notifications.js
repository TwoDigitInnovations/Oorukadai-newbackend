"use strict";
const mongoose = require("mongoose");
const Notification = mongoose.model("Notification");
const response = require("./../responses");

module.exports = {
  getNotification: async (req, res) => {
    try {
      const userId = req.user.id;
      const notifications = await Notification.find({ for: userId })
        .sort({ sent_at: -1 })
        .populate("for", "email _id")
        .exec();

        console.log("Fetched notifications for user:", userId);

      return res.status(200).json({
        status: true,
        data: notifications,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return response.error(res, error);
    }
  }
};
