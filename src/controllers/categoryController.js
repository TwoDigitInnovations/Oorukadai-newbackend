const mongoose = require("mongoose");
const response = require("../responses");
const generateUniqueId = require("generate-unique-id");
const Category = require("@models/Category");

module.exports = {

    createCategory: async (req, res) => {
        try {
            const payload = req?.body || {};
            payload.posted_by = req.user.id;
            payload.slug = payload.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
            let cat = new Category(payload);
            await cat.save();
            return response.success(res, { message: 'Category added successfully' });
        } catch (error) {
            return response.error(res, error);
        }
    },

    getCategory: async (req, res) => {
        try {
            let name = "Chetan"
            const id3 = generateUniqueId({
                includeSymbols: ['@', '#'],
                length: 8,
                // useLetters:false
            });
            let n = name.replaceAll(' ', '');
            var output = n.substring(0, 2) +
                n.substring(2, n.length - 2).replace(/./g, '*') +
                n.substring(n.length - 2, n.length)
            let n2 = output.split('*')[0];
            let n3 = output.split('*')[output.split('*').length - 1];
            console.log(n2, id3, n3)
            let n4 = n2 + id3 + n3
            let d = n4.toUpperCase()
            console.log(d)
            const { page = 1, limit } = req.query;
            let category = await Category.find().limit(limit * 1)
                .skip((page - 1) * limit);
            return response.success(res, category);
        } catch (error) {
            return response.error(res, error);
        }
    },


    getPopularCategory: async (req, res) => {
        try {
            let category = await Category.aggregate([
                {
                    $match: { popular: true }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'category',
                        as: 'products',
                        pipeline: [
                            {
                                $limit: 2
                            },
                            {
                                $project: {
                                    "varients": { $arrayElemAt: ["$varients.image", 0] },
                                }
                            },
                            {
                                $project: {
                                    "image": { $arrayElemAt: ["$varients", 0] },
                                }
                            }
                        ]
                    }
                },
                {
                    $project: {
                        "name": 1,
                        "image": 1,
                        "products": 1
                    }
                },
                {
                    $limit: 3
                },
            ]);
            return response.success(res, category);
        } catch (error) {
            return response.error(res, error);
        }
    },



    getCategoryById: async (req, res) => {
        try {
            let category = await Category.findById(req?.params?.id);
            return response.success(res, category);
        } catch (error) {
            return response.error(res, error);
        }
    },

    updateCategory: async (req, res) => {
        try {
            const payload = req?.body || {};
            if (payload.name) {
                payload.slug = payload.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
            }
            let category = await Category.findByIdAndUpdate(payload?.id, payload, {
                new: true,
                upsert: true,
            });
            return response.success(res, category);
        } catch (error) {
            return response.error(res, error);
        }
    },

    deleteCategory: async (req, res) => {
        try {
            await Category.findByIdAndDelete(req?.params?.id);
            return response.success(res, { meaasge: "Deleted successfully" });
        } catch (error) {
            return response.error(res, error);
        }
    },

    deleteAllCategory: async (req, res) => {
        try {
            const newid = req.body.category.map(f => new mongoose.Types.ObjectId(f))
            await Category.deleteMany({ _id: { $in: newid } });
            return response.success(res, { meaasge: "Deleted successfully" });
        } catch (error) {
            return response.error(res, error);
        }
    },

};