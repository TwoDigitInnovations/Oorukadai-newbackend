"use strict";

const mongoose = require("mongoose");
const withdrawreqSchema = new mongoose.Schema(
  {
    note: {
      type: String,
    },
    request_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    amount: {
      type: Number,
    },
    settle: {
      type: String,
      default: 'Pending'
    },
    type: {
      type: String,
      enum: ['debit', 'credit'],
      default: 'debit'
    },
    description: {
      type: String
    },
    referenceId: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

withdrawreqSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

const Withdrawreq = mongoose.model("Withdrawreq", withdrawreqSchema);

module.exports = Withdrawreq;
