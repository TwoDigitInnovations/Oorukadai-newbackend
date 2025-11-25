'use strict';

const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
    deliveryCharge: {
        type: Number,
        required: true
    },
    serviceCharge: {
        type: Number,
        required: true
    },
    deliveryPartnerTip: [{
        type: Number,
        required: true
    }],
}, {
    timestamps: true
});

const Charge = mongoose.model('Charge', taxSchema);

module.exports = Charge;
