const mongoose = require("mongoose");
const response = require("../responses");
const Theme = require("@models/Theme");

module.exports = {

    createTheme: async (req, res) => {
        try {
            const payload = req?.body || {};
            payload.posted_by = req.user.id;
            let cat = new Theme(payload);
            await cat.save();
            return response.success(res, { message: 'Theme added successfully' });
        } catch (error) {
            return response.error(res, error);
        }
    },

    getTheme: async (req, res) => {
        try {
            let theme = await Theme.find();
            return response.success(res, theme);
        } catch (error) {
            return response.error(res, error);
        }
    },

    getThemeById: async (req, res) => {
        try {
            let theme = await Theme.findById(req?.params?.id);
            return response.success(res, theme);
        } catch (error) {
            return response.error(res, error);
        }
    },

    updateTheme: async (req, res) => {
        try {
            const payload = req?.body || {};
            let theme = await Theme.findByIdAndUpdate(payload?.id, payload, {
                new: true,
                upsert: true,
            });
            return response.success(res, theme);
        } catch (error) {
            return response.error(res, error);
        }
    },

    deleteTheme: async (req, res) => {
        try {
            await Theme.findByIdAndDelete(req?.params?.id);
            return response.success(res, { meaasge: "Deleted successfully" });
        } catch (error) {
            return response.error(res, error);
        }
    },

    deleteAllTheme: async (req, res) => {
        try {
            const newid = req.body.Theme.map(f => new mongoose.Types.ObjectId(f))
            await Theme.deleteMany({ _id: { $in: newid } });
            return response.success(res, { meaasge: "Deleted successfully" });
        } catch (error) {
            return response.error(res, error);
        }
    },

};