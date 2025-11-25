'use strict';

const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
    // userId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    taxRate: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    // taxType: {
    //     type: String,
    //     enum: ['GST', 'VAT'],
    //     required: true,
    //     default: 'GST'
    // }
}, {
    timestamps: true
});

const Tax = mongoose.model('Tax', taxSchema);

module.exports = Tax;
