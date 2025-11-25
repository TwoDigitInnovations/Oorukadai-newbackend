"use strict";

const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    carousel: [
      {
        image: {
          type: String,
        },
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      },
    ],
    referelpoint: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);
settingSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;
