"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
    },
    lastname: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
    },
    number: {
      type: String,
      unique: true,
    },
    location: {
      type: pointSchema,
    },
    gender: {
      type: String,
    },
    profile:{
           type: String,
    },
    company: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      String,
    },
    type: {
      type: String,
      enum: ["USER", "ADMIN", "EMPLOYEE", "DRIVER"],
      default: "USER",
    },
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Pending", "Inactive", "Verified", "Suspended"],
    },
    store_name: {
      type: String,
    },
    country: {
      type: String,
    },
    store_doc: {
      type: String,
    },
    national_id_no: {
      type: String,
    },
    national_id: {
      type: String,
    },

    dl_number: {
      type: String,
    },
    number_plate_no: {
      type: String,
    },
    dl_image: {
      type: String,
    },
    number_plate_image: {
      type: String,
    },
    address_support_letter: {
      type: String,
    },
    background_check_document: {
      type: String,
    },
    ApartmentNo: {
      type: String,
    },
    SecurityGateCode: {
      type: String,
    },
    zipcode: {
      type: String,
    },
    isBusiness: {
      type: Boolean,
      default: false,
    },
    BusinessAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

userSchema.methods.encryptPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

userSchema.methods.isValidPassword = function isValidPassword(password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
