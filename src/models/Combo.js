'use strict';

const mongoose = require('mongoose');


const combochema = new mongoose.Schema({

    ComboProduct: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },

        }
    ],
    total: {
        type: Number
    },
    withdiscount: {
        type: Number
    },

}, {
    timestamps: true
});

combochema.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});
combochema.index({ location: "2dsphere" });

const Combo = mongoose.model('Combo', combochema);

module.exports = Combo;