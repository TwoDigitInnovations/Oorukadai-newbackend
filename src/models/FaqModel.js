const mongoose = require('mongoose');

const FaqSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    }
}, { timestamps: true });


FaqSchema.set("toJSON", {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    },
})

const Faq = mongoose.model('Faq', FaqSchema);

module.exports = Faq;