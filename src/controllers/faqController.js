const Faq = require("@models/FaqModel");
const response = require("../responses");
const mongoose = require('mongoose');

exports.getFaqs = async (req, res) => {
    try {
        const faqs = await Faq.find();
        res.status(200).json({ status: true, data: faqs });

    } catch (error) {
        return response.error(res, error);
    }
};


exports.createFaq = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const newFaq = new Faq({ question, answer });
        await newFaq.save();
        res.status(201).json({ status: true, message: 'FAQ created successfully', faq: newFaq });
    } catch (error) {
        return response.error(res, error);
    }
};


exports.updateFaq = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const updatedFaq = await Faq.findByIdAndUpdate(req.params.id, { question, answer }, { new: true });
        if (!updatedFaq) return res.status(404).json({ status: false, message: 'FAQ not found' });
        res.status(200).json({ status: true, message: 'FAQ updated successfully', faq: updatedFaq });
    } catch (error) {
        return response.error(res, error);
    }
};

exports.deleteFaq = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: false, message: "Invalid FAQ ID" });
        }

        const deletedFaq = await Faq.findByIdAndDelete(id);
        if (!deletedFaq) {
            return res.status(404).json({ status: false, message: "FAQ not found" });
        }

        res.status(200).json({ status: true, message: "FAQ deleted successfully" });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};;
