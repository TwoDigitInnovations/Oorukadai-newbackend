"use strict";
const mongoose = require("mongoose");
const newsletter = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,

    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

newsletter.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

const Newsletter = mongoose.model("Newsletter", newsletter);

module.exports = Newsletter;
