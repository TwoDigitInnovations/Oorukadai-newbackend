const mongoose = require("mongoose");
const response = require("../responses");
const Store = require("@models/Store");
const User = require("@models/User");

module.exports = {

    // createStore: async (req, res) => {
    //     try {
    //         const payload = req?.body || {};
    //         let cat = new Store(payload);
    //         await cat.save();
    //         const users = await User.findById(cat.userid);
    //         console.log(users);

    //         if (!users) {
    //             return response.error(res, { message: 'User  not found' });
    //         }
    //         users.role = 'seller';
    //         console.log("User  before saving:", users);

    //         try {
    //             await users.save();
    //             console.log("User  type updated to SELLER", users.save());
    //         } catch (saveError) {
    //             console.error("Error saving user:", saveError);
    //             return response.error(res, { message: 'Failed to update user type' });
    //         }
    //         return response.success(res, { message: 'Your Log in Details will be send in your email please have a look  !' });
    //     } catch (error) {
    //         return response.error(res, error);
    //     }
    // },
 createStore: async (req, res) => {
       
        
        try {
            const payload = req?.body || {};
            console.log("Payload:", payload);
            
            let cat = new Store(payload);
            await cat.save();
          
            
            const users = await User.findById(cat.userid);
            console.log("User found:", users);

            if (!users) {
                console.log("User not found with ID:", cat.userid);
                return response.error(res, { message: 'User not found' });
            }
            
         
            // Update user role and phone number
            users.role = 'seller';
            
            // Save phone number from store data to user profile
            if (payload.phone) {
                users.number = payload.phone;
                users.mobile = payload.phone; // Save to both fields for backward compatibility
            }
            
            const savedUser = await users.save();
            console.log('Updated user data:', savedUser);
            
            return response.success(res, { 
                message: 'Your Log in Details will be sent to your email. Please check your inbox!',
                store: cat,
                user: savedUser
            });
        } catch (error) {
            console.error("Error in createStore:", error);
            return response.error(res, error);
        }
    },
    getStore: async (req, res) => {
        try {
            let data = {}
            if (req.user.type === 'seller') {
                data.userid = req.user.id
            }
            let product = await Store.find(data).populate('category').sort({ 'createdAt': -1 });
            return response.success(res, product);
        } catch (error) {
            return response.error(res, error);
        }
    },

    getStoreById: async (req, res) => {
        try {
            let product = await Store.findById(req?.params?.id).populate('category');
            return response.success(res, product);
        } catch (error) {
            return response.error(res, error);
        }
    },



    updateStore: async (req, res) => {
        try {
            const payload = req?.body || {};
            // let product = await Store.findByIdAndUpdate(payload?.id, payload, {
            //     new: true,
            //     upsert: true,
            // });
            let product = await User.findByIdAndUpdate(payload?.id, payload, {
                new: true,
                upsert: true,
            });
            return response.success(res, product);
        } catch (error) {
            return response.error(res, error);
        }
    },


    deleteStore: async (req, res) => {
        try {
            await Store.findByIdAndDelete(req?.params?.id);
            return response.success(res, { meaasge: "Deleted successfully" });
        } catch (error) {
            return response.error(res, error);
        }
    },

    deleteAllStore: async (req, res) => {
        try {
            const newid = req.body.products.map(f => new mongoose.Types.ObjectId(f))
            await Store.deleteMany({ _id: { $in: newid } });
            return response.success(res, { meaasge: "Deleted successfully" });
        } catch (error) {
            return response.error(res, error);
        }
    },



};