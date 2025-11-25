const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['banner', 'new_arrival'],
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  buttonText: {
    type: String,
    default: 'Shop Now'
  },
  image: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Gallery', gallerySchema);
