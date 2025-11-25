"use strict";

const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  // Hero Section
  heroTitle: {
    type: String,
    default: 'Our Story'
  },
  heroDescription1: {
    type: String,
    default: 'Welcome to our store, where quality meets style.'
  },
  heroDescription2: {
    type: String,
    default: 'Our mission is to make shopping easy and enjoyable.'
  },
  heroImage: {
    type: String,
    default: '/img4.png'
  },

  // Statistics Section
  statistics: [{
    title: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: 'chart'
    }
  }],

  // Team Members Section
  teamMembers: [{
    name: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    image: {
      type: String,
      required: true
    }
  }],

  // Services Section
  services: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: 'service'
    }
  }],

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

aboutSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

const About = mongoose.model('About', aboutSchema);

module.exports = About;
