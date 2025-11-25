"use strict";
const mongoose = require("mongoose");
const getintouch = new mongoose.Schema(
  {
    last_name: {
      type: String,
    },
    first_name: {
      type: String,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    description: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    reason: { type: String, required: true },
    status: {
      type: String,
      // enum: [
      //   "pending",
      //   "resolved",
      //   "processing",
      //   "refunded",
      //   "reissued",
      //   "reinstated",
      //   "returned",
      //   "re-ordered",
      // ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

getintouch.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

const Getintouch = mongoose.model("Getintouch", getintouch);

module.exports = Getintouch;
