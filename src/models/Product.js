

'use strict';
 
const mongoose = require('mongoose');
const productchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
    },
    theme: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Theme",
    }],
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    categoryName: {
        type: String,
    },
    gender: {
        type: String,
    },
    origin: {
        type: String,
    },
    manufacturername: {
        type: String,
    },
    manufactureradd: {
        type: String,
    },
    expirydate: {
        type: Date,
        default: null
    },
    name: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        unique: true,
        sparse: true
    },
    model: {
        type: String,
        default: ""
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    deliveryLabel: {
        type: String
    },
    slug: {
        type: String,
    },
    image: {
        type: String,
    },
    images: {
        type: [String],
        default: []
    },
    short_description: {
        type: String,
    },
    long_description: {
        type: String,
    },
 
    pieces: {
        type: Number,
    },
    sold_pieces: {
        type: Number,
        default: 0
    },
    varients: [{
        color: String,
        image: [String],
        selected: [],
        price: {
            type: Number,
            default: 0
        },
        Offerprice: {
            type: Number,
            default: 0
        }
    }],
    hasVariants: {
        type: Boolean,
        default: false
    },
    minQuantity: {
        type: Number
    },
    parameter_type: {
        type: String
    },
    price_slot: [{
        value: {
            type: String,
        },
        Offerprice: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            default: 0
        },
    }],
    is_verified: {
        type: Boolean,
        default: false
    },
    is_quality: {
        type: Boolean,
        default: false
    },
    sponsered: {
        type: Boolean
    },
    status: {
        type: String,
        enum: ["verified", "suspended"],
        default: "verified",
    },
    attributes: [
        {
            name: { type: String },
            value: { type: String, default: '' }
        }
    ]
}, {
    timestamps: true
});


productchema.index({ sold_pieces: -1 }); // Index for top sold products
productchema.index({ status: 1, sold_pieces: -1 }); // Compound index for verified products by sales
productchema.index({ createdAt: -1 }); // Index for newest products
productchema.index({ category: 1, status: 1 }); // Index for category filtering

productchema.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});
 
const Product = mongoose.model('Product', productchema);
 
module.exports = Product;



