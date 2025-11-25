"use strict";

const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  termsAndConditions: {
    type: String,
  },
  privacy: {
    type: String,
  },
  returnPolicy: {
    type: String,
  },
  aboutPage: {
    heroTitle: { type: String, default: 'Our Story' },
    heroDescription1: { type: String, default: 'Welcome to our store, where quality meets style. We are dedicated to providing the best products with exceptional customer service.' },
    heroDescription2: { type: String, default: 'Our mission is to make shopping easy, enjoyable, and accessible to everyone, everywhere.' },
    heroImage: { type: String, default: '/img4.png' },
    stats: [
      {
        title: { type: String, default: 'Active Sellers' },
        value: { type: String, default: '10.5k' },
        icon: { type: String, default: 'chart' }
      },
      {
        title: { type: String, default: 'Monthly Product Sale' },
        value: { type: String, default: '33k' },
        icon: { type: String, default: 'sale' }
      },
      {
        title: { type: String, default: 'Customer Active' },
        value: { type: String, default: '45.5k' },
        icon: { type: String, default: 'users' }
      },
      {
        title: { type: String, default: 'Annual Gross Sale' },
        value: { type: String, default: '25k' },
        icon: { type: String, default: 'gross' }
      }
    ],
    team: [
      {
        name: { type: String, default: 'Tom Cruise' },
        position: { type: String, default: 'Founder & Chairman' },
        image: { type: String, default: '/img.png' }
      },
      {
        name: { type: String, default: 'Emma Watson' },
        position: { type: String, default: 'Managing Director' },
        image: { type: String, default: '/img2.png' }
      },
      {
        name: { type: String, default: 'Will Smith' },
        position: { type: String, default: 'Product Designer' },
        image: { type: String, default: '/img3.png' }
      }
    ]
  }
});


contentSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
})

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;



