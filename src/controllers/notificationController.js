const mongoose = require("mongoose");
const response = require("../responses");
const mailNotification = require("../services/mailNotification");
const Notification = require("@models/Notification");

module.exports = {
  getnotification: async (req, res) => {
    try {
      const ids = req.user.id;
      const data = await Notification.find({ for: { $in: ids } }).sort({
        createdAt: -1,
      });
      console.log("data fetched");
      return response.success(res, data);
      // res.status(200).json(data);
    } catch (err) {
      console.log(err);
      return response.error(res, err);
      // res.status(500).json({error:'Internal Server Error'});
    }
  },
  //   sendNotification: async (req, res) => {
  //     try {
  //       const { title, description, userIds = [] } = req.body;

  //       const batchSize = 20;

  //       for (let i = 0; i < userIds.length; i += batchSize) {
  //         const batch = userIds.slice(i, i + batchSize);

  //         await mailNotification.sendNotification(batch, title, description);
  //       }

  //       //   const notification = new Notification({
  //       //     title,
  //       //     message,
  //       //     for: userIds,
  //       //   });

  //       //   await notification.save();
  //       return response.success(res, "Notification sent successfully");
  //     } catch (err) {
  //       console.log(err);
  //       return response.error(res, err);
  //       // res.status(500).json({error:'Internal Server Error'});
  //     }
  //   },
  sendNotification: async (req, res) => {
    try {
      const { title, description, userIds } = req.body;

      // Respond to frontend first
      response.success(res, "Emails are being sent");

      // Then process in background
      process.nextTick(async () => {
        try {
          await mailNotification.sendNotification(userIds, title, description);
          console.log("All emails sent.");
        } catch (emailErr) {
          console.error("Error sending emails:", emailErr);
        }
      });
    } catch (err) {
      console.log(err);
      return response.error(res, err);
    }
  },
};
