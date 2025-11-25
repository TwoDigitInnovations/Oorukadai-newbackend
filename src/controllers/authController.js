const mongoose = require('mongoose');
const User = require('@models/User');
const bcrypt = require('bcryptjs');
const response = require('@responses/index');
const userHelper = require('../helper/user');
const Verification = require('@models/Verification');
const jwt = require("jsonwebtoken");
const ProductRequest = require('@models/ProductRequest');
const Product = require('@models/Product');
const path = require('path');
const fs = require('fs');
const { welcomeMail } = require('@services/mailNotification');
// const { v4: uuidv4 } = require('uuid');
const { cloudinary } = require('@services/fileUpload');

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    console.log('Upload profile image request received');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    console.log('File received:', req.file);
    
    // Get user ID from the authenticated request
    const userId = req.user.id;
    console.log('User ID:', userId);
    
    try {
      console.log('Uploading to Cloudinary...');
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'profile_pictures',
        width: 500,
        height: 500,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      });

      console.log('Cloudinary upload successful:', result.secure_url);

      // Update user's profile picture in the database
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePicture: result.secure_url },
        { new: true, runValidators: true }
      );

      console.log('User profile picture updated');

      // Delete the temporary file
      if (req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Temporary file deleted');
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePicture: result.secure_url
      });
      
    } catch (uploadError) {
      console.error('Error uploading to Cloudinary:', uploadError);
      
      // Clean up the temporary file if it exists
      if (req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Cleaned up temporary file after error');
        } catch (unlinkError) {
          console.error('Error cleaning up temporary file:', unlinkError);
        }
      }
      
      throw new Error(uploadError.message || 'Failed to upload image to storage');
    }
    
  } catch (error) {
    console.error('Error in uploadProfileImage:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Error uploading profile image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSellerList: async (req, res) => {
    try {
      
      const allUsers = await User.find({}).limit(5);
      console.log("All users sample:", JSON.stringify(allUsers, null, 2));
      
      const sellersOnly = await User.find({ role: "seller" });
      console.log("Sellers found:", sellersOnly.length);
      
      let page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 10;
      let skip = (page - 1) * limit;

      const search = req.query.search?.trim() || null;

      const matchStage = {
        role: "seller", 
      };

      if (search) {
        const searchRegex = new RegExp(search, "i");
        matchStage.$or = [
          { firstName: { $regex: searchRegex } },
          { lastName: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
        ];
      }

      let users = await User.find(matchStage)
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order (newest first)
        .skip(skip)
        .limit(limit)
        .lean(); // Use lean() for better performance

      // Attach stats to each seller individually
      const indexedUsers = await Promise.all(
        users.map(async (user, index) => {
          const sellerId = user._id;

          const [totalOrders, totalProducts, totalEmployees, incomeTaxStats] =
            await Promise.all([
              ProductRequest.countDocuments({ seller_id: sellerId }),
              Product.countDocuments({ userid: sellerId }),
              User.countDocuments({
                type: "EMPLOYEE",
                parent_vendor_id: sellerId,
              }),
              ProductRequest.aggregate([
                {
                  $match: { seller_id: sellerId }, // Fixed: removed unnecessary ObjectId wrapper
                },
                {
                  $group: {
                    _id: null,
                    totalIncome: { $sum: { $ifNull: ["$total", 0] } },
                    totalTax: { $sum: { $ifNull: ["$tax", 0] } },
                  },
                },
              ]),
            ]);

          const returnRefundStats = await ProductRequest.aggregate([
            { $match: { seller_id: sellerId } }, // Fixed: removed unnecessary ObjectId wrapper
            { $unwind: "$productDetail" },
            {
              $group: {
                _id: null,
                returnedItems: {
                  $sum: {
                    $cond: ["$productDetail.returnDetails.isReturned", 1, 0],
                  },
                },
                refundedItems: {
                  $sum: {
                    $cond: ["$productDetail.returnDetails.isRefunded", 1, 0],
                  },
                },
                totalRefundAmount: {
                  $sum: {
                    $cond: [
                      "$productDetail.returnDetails.isRefunded",
                      {
                        $ifNull: [
                          "$productDetail.returnDetails.refundAmount",
                          0,
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
            },
          ]);

          const stats = {
            totalOrders,
            totalProducts,
            totalEmployees,
            returnedItems: returnRefundStats[0]?.returnedItems || 0,
            refundedItems: returnRefundStats[0]?.refundedItems || 0,
            totalRefundAmount: returnRefundStats[0]?.totalRefundAmount || 0,
            totalIncome: incomeTaxStats[0]?.totalIncome || 0,
            totalTax: incomeTaxStats[0]?.totalTax || 0,
          };

          // Get store data separately for each user
          const Store = require('@models/Store'); // Add this import at top
          const storeData = await Store.findOne({ userid: sellerId }).sort({ createdAt: -1 });

          return {
            ...user,
            indexNo: skip + index + 1,
            stats,
            store: storeData || null, // Add store data
          };
        })
      );

      const totalUsers = await User.countDocuments({ role: "seller" }); // Changed from 'type' to 'role'
      const totalPages = Math.ceil(totalUsers / limit);

      return res.status(200).json({
        status: true,
        data: indexedUsers,
        pagination: {
          totalItems: totalUsers,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      console.error("Error in getSellerList:", error);
      return response.error(res, error);
    }
  },
  register: async (req, res) => {
    try {
      console.log('Registration request received:', req.body);
      
      // Trim all string inputs to remove any accidental whitespace
      const { firstName, lastName, email, password, role = 'user' } = req.body;
      
      // Input validation
      if (!firstName || !lastName || !email || !password) {
        const error = new Error('First name, last name, email, and password are required');
        error.status = 400;
        throw error;
      }

      // Trim and validate email format
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        const error = new Error('Please enter a valid email address');
        error.status = 400;
        throw error;
      }

      if (password.length < 6) {
        const error = new Error('Password must be at least 6 characters long');
        error.status = 400;
        throw error;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: trimmedEmail });
      if (existingUser) {
        const error = new Error('A user with this email already exists');
        error.status = 400;
        throw error;
      }

      // Create new user
      const newUser = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimmedEmail,
        role: role === 'admin' ? 'user' : role, // Prevent admin role assignment during registration
        status: 'active' // Explicitly set status to active
      });
      
      // Hash password
      newUser.password = newUser.encryptPassword(password);
      
      // Validate the user document before saving
      try {
        await newUser.validate();
      } catch (validationError) {
        console.error('Validation error:', validationError);
        throw validationError;
      }
      
      // Save user to database
      await newUser.save();

      // Get user without password for response
      const userResponse = await User.findById(newUser._id).select('-password');

      // Send welcome email (async - don't wait for it)
      try {
        console.log('Attempting to send welcome email to:', newUser.email);
        const emailInfo = {
          name: `${newUser.firstName} ${newUser.lastName}`.trim(),
          email: newUser.email
        };
        console.log('Email details:', emailInfo);
        
        await welcomeMail(emailInfo);
        console.log('Welcome email sent successfully to:', newUser.email);
      } catch (emailError) {
        console.error('Failed to send welcome email. Error details:', {
          message: emailError.message,
          stack: emailError.stack,
          response: emailError.response,
          code: emailError.code,
          email: newUser.email,
          time: new Date().toISOString()
        });
      }

      console.log('User registered successfully:', {
        id: userResponse._id,
        email: userResponse.email,
        name: `${userResponse.firstName} ${userResponse.lastName}`,
        role: userResponse.role,
        status: userResponse.status,
        createdAt: userResponse.createdAt
      });
      
      return res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to Merk!',
        user: userResponse,
      });
    } catch (error) {
      console.error('Registration error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        errors: error.errors
      });
      
      const status = error.status || 500;
      const message = status === 400 ? error.message : 'An error occurred during registration';
      
      return res.status(status).json({
        success: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;
    try {
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: 'Email and password are required' });
      }

      const user = await User.findOne({ email });

      console.log(user)
      if (!user)
        return res.status(401).json({ message: 'Invalid email or password' });

      const isMatch = await user.isValidPassword(password);
      if (!isMatch)
        return res.status(401).json({ message: 'Invalid email or password' });

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'secret123',
        {
          expiresIn: '7d',
        },
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          role: user.role,
           status: user.status,
          token
        },
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  },

  sendOTP: async (req, res) => {
    try {
      const email = req.body.email;

      const user = await User.findOne({ email });

      console.log('ssssss', user);
      if (!user) {
        return response.badReq(res, { message: 'Email does exist.' });
      }
      // OTP is fixed for Now: 0000
      let ran_otp = '0000';
      // let ran_otp = Math.floor(1000 + Math.random() * 9000);
      // await mailNotification.sendOTPmail({
      //   code: ran_otp,
      //   email: email
      // });
      let ver = new Verification({
        //email: email,
        user: user._id,
        otp: ran_otp,
        expiration_at: userHelper.getDatewithAddedMinutes(5),
      });
      await ver.save();
      let token = await userHelper.encode(ver._id);

      return response.success(res, { message: 'OTP sent.', token });
    } catch (error) {
      return response.error(res, error);
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const otp = req.body.otp;
      const token = req.body.token;
      if (!(otp && token)) {
        return response.badReq(res, { message: 'OTP and token required.' });
      }
      let verId = await userHelper.decode(token);
      let ver = await Verification.findById(verId);
      if (
        otp == ver.otp &&
        !ver.verified &&
        new Date().getTime() < new Date(ver.expiration_at).getTime()
      ) {
        let token = await userHelper.encode(
          ver._id + ':' + userHelper.getDatewithAddedMinutes(5).getTime(),
        );
        ver.verified = true;
        await ver.save();
        return response.success(res, { message: 'OTP verified', token });
      } else {
        return response.notFound(res, { message: 'Invalid OTP' });
      }
    } catch (error) {
      return response.error(res, error);
    }
  },

  changePassword: async (req, res) => {
    try {
      const token = req.body.token;
      const password = req.body.password;
      const data = await userHelper.decode(token);
      const [verID, date] = data.split(':');
      if (new Date().getTime() > new Date(date).getTime()) {
        return response.forbidden(res, { message: 'Session expired.' });
      }
      let otp = await Verification.findById(verID);
      if (!otp?.verified) {
        return response?.forbidden(res, { message: 'unAuthorize' });
      }
      let user = await User.findById(otp.user);
      if (!user) {
        return response.forbidden(res, { message: 'unAuthorize' });
      }
      await Verification.findByIdAndDelete(verID);
      user.password = user.encryptPassword(password);
      await user.save();
      //mailNotification.passwordChange({ email: user.email });
      return response.success(res, {
        message: 'Password changed ! Login now.',
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

 fileUpload: async (req, res) => {
    try {
        if (!req.file) {
            return response.error(res, { message: "No file uploaded" });
        }
        return response.success(res, {
            message: "File uploaded successfully.",
            file: req.file.path,
        });
    } catch (error) {
        console.error("File upload error:", error);
        return response.error(res, error);
    }
},

  getProfile: async (req, res) => {
    try {
      const u = await User.findById(req.user.id, "-password");
      return response.success(res, u);
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateProfile : async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;

    const updatedUser = await user.save();

    const userWithoutPassword = updatedUser.toObject();
    delete userWithoutPassword.password;

    return response.success(res, userWithoutPassword);
  } catch (error) {
    console.error("Update Profile Error:", error);
    return response.error(res, error);
  }
},
updatePassword : async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "All password fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    return response.error(res, error);
  }




},



deleteAccount : async (req, res) => {
  try {
    const userId = req.user._id; 
    
   
    
    
    await User.findByIdAndDelete(userId);
    
   
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
},

// Export the uploadProfileImage function
uploadProfileImage

};
