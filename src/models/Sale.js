"use strict";

const mongoose = require("mongoose");
const saleschema = new mongoose.Schema(
  {
    startDateTime: {
      type: Date,
      required: true,
    },

    endDateTime: {
      type: Date,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },
    SellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

saleschema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("FlashSale", saleschema);
