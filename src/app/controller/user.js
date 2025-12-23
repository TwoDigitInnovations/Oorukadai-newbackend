"use strict";
const userHelper = require("./../helper/user");
const response = require("./../responses");
const passport = require("passport");
const jwtService = require("./../services/jwtService");
const mailNotification = require("./../services/mailNotification");
const mongoose = require("mongoose");
const Device = mongoose.model("Device");
const User = mongoose.model("User");
const Review = mongoose.model("Review");
const Store = mongoose.model("Store");
const Verification = mongoose.model("Verification");
const ProductRequest = mongoose.model("ProductRequest");
const { v4: uuidv4 } = require("uuid");
const generateUniqueId = require("generate-unique-id");
const { notify } = require("../services/notification");
const ExcelJS = require("exceljs");
const {
  sendMailWithSubjectViaSendgrid,
  sendMailWithSTemplateViaSendgrid,
} = require("../services/sendgrid");

module.exports = {
  // login controller
  login: (req, res) => {
    console.log("request came here");
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return response.error(res, err);
      }
      if (!user) {
        return response.unAuthorize(res, info);
      }
      let token = await new jwtService().createJwtToken({
        id: user._id,
        type: user.type,
        tokenVersion: new Date(),
      });
      await user.save();
      let data = {
        token,
        ...user._doc,
      };
      if (user.type === "SELLER") {
        let store = await Store.findOne({ userid: user._id });
        data.store = store;
      }
      delete data.password;
      return response.ok(res, { ...data });
    })(req, res);
  },

  signUp: async (req, res) => {
    try {
      const payload = req.body;
      const mail = req.body.email;
      if (!mail) {
        return response.badReq(res, { message: "Email required." });
      }
      let user2 = await User.findOne({
        email: payload.email.toLowerCase(),
      });
      const user = await User.findOne({ number: payload.number });
      if (user) {
        return res.status(404).json({
          success: false,
          message: "Phone number already exists.",
        });
      }
      if (user2) {
        return res.status(404).json({
          success: false,
          message: "Email Id already exists.",
        });
      } else {
        let name = payload?.username;
        const id3 = generateUniqueId({
          includeSymbols: ["@", "#"],
          length: 8,
        });
        let n = name.replaceAll(" ", "");
        var output =
          n.substring(0, 2) + id3 + n.substring(n.length - 2, n.length);
        let d = output.toUpperCase();
        let user = new User({
          username: payload?.username,
          email: payload?.email,
          number: payload?.number,
          type: payload?.type,
          lastname: payload?.lastname,
        });

        if (payload?.type === "DRIVER") {
          user.status = "Pending";
        }

        user.password = user.encryptPassword(req.body.password);
        await user.save();

        // await mailNotification.welcomeMail({
        //   username: user?.username,
        //   email: user?.email,
        //   lastname: user?.lastname,
        // });

        res.status(200).json({ success: true, data: user });
      }
    } catch (error) {
      return response.error(res, error);
    }
  },

  changePasswordProfile: async (req, res) => {
    try {
      let user = await User.findById(req.user.id);
      if (!user) {
        return response.notFound(res, { message: "User doesn't exists." });
      }
      user.password = user.encryptPassword(req.body.password);
      await user.save();
      return response.ok(res, { message: "Password changed." });
    } catch (error) {
      return response.error(res, error);
    }
  },

  me: async (req, res) => {
    try {
      let user = userHelper.find({ _id: req.user.id }).lean();
      return response.ok(res, user);
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateUser: async (req, res) => {
    try {
      delete req.body.password;
      await User.updateOne({ _id: req.user.id }, { $set: req.body });
      return response.ok(res, { message: "Profile Updated." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  sendOTP: async (req, res) => {
    try {
      const email = req.body.email;
      const user = await User.findOne({ email });

      if (!user) {
        return response.badReq(res, { message: "Email does not exist." });
      }

      let ran_otp = Math.floor(1000 + Math.random() * 9000);

      await mailNotification.sendOTPmail({
        code: ran_otp,
        email: email,
      });

      let ver = new Verification({
        user: user._id,
        otp: ran_otp,
        expiration_at: userHelper.getDatewithAddedMinutes(5),
      });
      await ver.save();
      // }
      let token = await userHelper.encode(ver._id);

      return response.ok(res, { message: "OTP sent.", token });
    } catch (error) {
      return response.error(res, error);
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const otp = req.body.otp;
      const token = req.body.token;
      if (!(otp && token)) {
        return response.badReq(res, { message: "otp and token required." });
      }
      let verId = await userHelper.decode(token);
      let ver = await Verification.findById(verId);
      if (
        otp == ver.otp &&
        !ver.verified &&
        new Date().getTime() < new Date(ver.expiration_at).getTime()
      ) {
        let token = await userHelper.encode(
          ver._id + ":" + userHelper.getDatewithAddedMinutes(5).getTime()
        );
        ver.verified = true;
        await ver.save();
        return response.ok(res, { message: "OTP verified", token });
      } else {
        return response.notFound(res, { message: "Invalid OTP" });
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
      const [verID, date] = data.split(":");
      if (new Date().getTime() > new Date(date).getTime()) {
        return response.forbidden(res, { message: "Session expired." });
      }
      let otp = await Verification.findById(verID);
      if (!otp.verified) {
        return response.forbidden(res, { message: "unAuthorize" });
      }
      let user = await User.findById(otp.user);
      if (!user) {
        return response.forbidden(res, { message: "unAuthorize" });
      }
      await Verification.findByIdAndDelete(verID);
      user.password = user.encryptPassword(password);
      await user.save();
      mailNotification.passwordChange({ email: user.email });
      return response.ok(res, { message: "Password changed! Login now." });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getUserList: async (req, res) => {
    try {
      const cond = { type: req.body.type };

      if (req.query.searchTerm && req.query.searchTerm.trim() !== "") {
        const searchTerm = req.query.searchTerm.trim();
        cond.$or = [
          { username: { $regex: searchTerm, $options: "i" } },
          { lastname: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
        ];
      }
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);

      let users;
      let totalItems;
      let pagination = null;

      if (!page || !limit) {
        users = await User.find(cond).sort({ createdAt: -1 });
        totalItems = users.length;
      } else {
        const skip = (page - 1) * limit;
        totalItems = await User.countDocuments(cond);
        const totalPages = Math.ceil(totalItems / limit);

        users = await User.find(cond)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

        pagination = {
          totalItems,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
        };
      }
      return res.status(200).json({
        status: true,
        data: users,
        pagination,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getSellerList: async (req, res) => {
    try {
      // let user = await User.find({ type: req.params.type });
      let user = await User.aggregate([
        {
          $match: { type: "SELLER" },
        },
        {
          $lookup: {
            from: "stores",
            localField: "_id",
            foreignField: "userid",
            as: "store",
          },
        },
        {
          $unwind: {
            path: "$store",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);
      return response.ok(res, user);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getDriverList: async (req, res) => {
    try {
      let page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 10;
      let skip = (page - 1) * limit;

      const [drivers, total] = await Promise.all([
        User.find({
          type: "DRIVER",
          status: { $in: ["Pending", "Verified", "Suspended"] },
        })
          .skip(skip)
          .limit(limit)
          .exec(),

        User.countDocuments({
          type: "DRIVER",
          status: { $in: ["Pending", "Verified", "Suspended"] },
        }),
      ]);

      return response.ok(res, {
        drivers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getVerifiedDriverList: async (req, res) => {
    try {
      const drivers = await User.find({
        type: "DRIVER",
        status: { $in: ["Verified"] },
      }).exec();
      return response.ok(res, drivers);
    } catch (error) {
      return response.error(res, error);
    }
  },

  updateStatus: async (req, res) => {
    try {
      const payload = req?.body || {};
      let driver = await User.findByIdAndUpdate(payload?.id, payload, {
        new: true,
        upsert: true,
      });
      return response.ok(res, driver);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getProfile: async (req, res) => {
    try {
      const u = await User.findById(req.user.id, "-password");
      const deviceId = await Device.findOne({ user: u._id });
      const playerId = deviceId ? deviceId.player_id : null;
      const data = {
        ...u._doc,
        playerId: playerId || null,
      };
      console.log("User profile data:", playerId);
      return response.ok(res, data);
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateProfile: async (req, res) => {
    const payload = req.body;
    const userId = req?.body?.userId || req.user.id;

    try {
      const u = await User.findByIdAndUpdate(
        userId,
        { $set: payload },
        {
          new: true,
          upsert: true,
        }
      );
      let token = await new jwtService().createJwtToken({
        id: u._id,
        type: u.type,
        tokenVersion: new Date(),
      });
      const data = {
        token,
        ...u._doc,
      };
      delete data.password;
      // await Verification.findOneAndDelete({ phone: payload.phone });
      return response.ok(res, data);
      // }

      // }
    } catch (error) {
      return response.error(res, error);
    }
  },

  fileUpload: async (req, res) => {
    try {
      // Cloudinary returns the file URL directly in req.file.path
      let fileUrl = req.file && req.file.path;
      return response.ok(res, {
        message: "File uploaded.",
        file: fileUrl,
        publicId: req.file && req.file.filename, // Cloudinary public_id for future operations
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  giverate: async (req, res) => {
    console.log(req.body);
    try {
      let payload = req.body;

      const existingReview = await Review.findOne({
        product: payload.product,
        posted_by: req.user.id,
      });

      if (existingReview) {
        // Update existing review
        existingReview.description = payload.description;
        existingReview.images = payload.images || []; // ✅ Add this line
        await existingReview.save();
      } else {
        // Create new review
        payload.posted_by = req.user.id;
        payload.images = payload.images || []; // ✅ Ensure images field exists
        const newReview = new Review(payload);
        await newReview.save();
      }

      return response.ok(res, { message: "Successfully submitted review" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getReview: async (req, res) => {
    try {
      const cond = {};
      if (req.params.id) {
        cond.user = req.params.id;
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const allreview = await Review.find(cond)
        .populate("product posted_by")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalReviews = await Review.countDocuments(cond);

      res.status(200).json({
        success: true,
        data: allreview,
        page: page,
        totalReviews: totalReviews,
        totalPages: Math.ceil(totalReviews / limit), // Calculate total pages
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  deleteReview: async (req, res) => {
    try {
      const ID = req.params.id;
      console.log(ID);
      const Re = await Review.findByIdAndDelete(ID);
      console.log(Re);

      if (!Re) {
        return response.notFound(res, { message: "Not Found" });
      }

      return response.ok(res, { message: "Review deleted successfully" });
    } catch (error) {
      console.log(error);
      return response.error(res, error);
    }
  },

  orderreadyNotification: async (req, res) => {
    try {
      const { id } = req.body;

      const product = await ProductRequest.findById(id).populate(
        "user",
        "email _id"
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const email = product.user.email;
      product.isReady = true;
      await product.save();

      if (product.isOrderPickup) {
        await mailNotification.orderReadyStore({
          email: email,
          id: product.orderId,
        });
        await notify(
          product.user._id,
          "Order Ready for Pickup",
          `Your order with ID ${product.orderId} is ready for pickup.`,
          product.orderId
        );
      } else if (product.isDriveUp) {
        await mailNotification.orderReady({
          email: email,
          id: product.orderId,
        });
        await notify(
          product.user._id,
          "Order Ready for Drive Up",
          `Your order with ID ${product.orderId} is ready for drive up.`,
          product.orderId
        );
      } else {
        return res.status(400).json({
          success: false,
          message: "No valid pickup option selected",
        });
      }

      console.log("product", product);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  },

  createEmployee: async (req, res) => {
    try {
      const payload = req.body;
      const vendorId = req.user.id;
      console.log("hi", vendorId);
      // const user = await User.findById(vendorId);

      // if (!user) {
      //   return response.notFound(res, { message: "Vendor not found" });
      // }

      const existingEmployee = await User.findOne({
        email: payload.email,
        type: "EMPLOYEE",
      });

      if (existingEmployee) {
        return response.conflict(res, { message: "Employee already exists" });
      }

      const employee = new User({
        ...payload,
        type: "EMPLOYEE",
        // parent_vendor_id: vendorId,
      });

      await mailNotification.sendWelcomeEmailToEmployee({
        email: payload.email,
        name: payload.username,
        password: payload.password,
      });

      employee.password = employee.encryptPassword(payload.password);
      await employee.save();

      return response.ok(res, { message: "Employee created successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getEmployeeList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const returnAllIds = req.query.all === "true";

      if (returnAllIds) {
        const allEmployees = await User.find({
          type: "EMPLOYEE",
          // parent_vendor_id: req.user.id,
        }).select("_id username");
        if (!allEmployees || allEmployees.length === 0) {
          return response.notFound(res, { message: "No employees found" });
        }
        return res.status(200).json({
          status: true,
          data: allEmployees,
        });
      }

      const employees = await User.find({
        type: "EMPLOYEE",
      })
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const indexedEmployees = employees.map((item, index) => ({
        ...(item.toObject?.() || item),
        indexNo: skip + index + 1,
      }));

      const totalEmployees = await User.countDocuments({
        type: "EMPLOYEE",
        // parent_vendor_id: vendorId,
      });

      const totalPages = Math.ceil(totalEmployees / limit);
      return res.status(200).json({
        status: true,
        data: indexedEmployees,
        pagination: {
          totalItems: totalEmployees,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
      // return response.ok(res, employees);
    } catch (error) {
      return response.error(res, error);
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const payload = req.body;
      const employeeId = req.body.id;

      const updatedEmployee = await User.findByIdAndUpdate(
        employeeId,
        payload,
        { new: true, runValidators: true }
      );

      if (!updatedEmployee) {
        return response.notFound(res, { message: "Employee not found" });
      }

      return response.ok(res, { message: "Employee updated successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteEmployee: async (req, res) => {
    try {
      const employeeId = req.params.id;
      // let vendorId;

      // if (req.user.type === "ADMIN"){
      //   vendorId = req.body.vendor
      // } else {
      //   vendorId = req.user.id
      // }

      const employee = await User.findById(employeeId);

      if (!employee) {
        return response.notFound(res, { message: "Employee not found" });
      }

      await employee.deleteOne();

      return response.ok(res, { message: "Employee deleted successfully" });
    } catch (error) {
      console.log(error);
      return response.error(res, error);
    }
  },

  getEmployeeById: async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employee = await User.findById(employeeId).select("-password");

      if (!employee) {
        return response.notFound(res, { message: "Employee not found" });
      }

      return response.ok(res, employee);
    } catch (error) {
      return response.error(res, error);
    }
  },

  sendMessageToCustomer: async (req, res) => {
    try {
      const { email, message, templateId, subject } = req.body;

      if (templateId) {
        await sendMailWithSTemplateViaSendgrid([email], templateId, subject);
      }

      if (message) {
        await mailNotification.MessageToCustomer({
          message: message,
          customerEmail: [email],
          subject,
        });
      }

      return response.ok(res, "message send Successfully");
    } catch (error) {
      return response.error(res, error);
    }
  },

  sendMessageToAllCustomer: async (req, res) => {
    try {
      const { message } = req.body;

      if (!message?.trim()) {
        return response.error(res, "Message is required");
      }

      const users = await User.find({ type: "USER" }).select("email name");

      if (!users.length) {
        return response.error(res, "No users found to send messages");
      }

      let successCount = 0;
      const failedEmails = [];

      await Promise.all(
        users.map(async (user) => {
          try {
            if (!user.email) return;

            await mailNotification.MessageToAllCustomer({
              name: user.name,
              message,
              customerEmail: user.email,
            });

            successCount++;
          } catch (err) {
            failedEmails.push(user.email);
          }
        })
      );

      // ✅ Return response summary
      return response.ok(res, {
        message: "Messages processed successfully",
        totalUsers: users.length,
        sent: successCount,
        failed: failedEmails.length,
        failedEmails,
      });
      
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      return response.error(res, "Failed to send messages");
    }
  },

  suspendUser: async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return response.error(res, "User ID is required");
      }

      const user = await User.findById(userId);
      if (!user) {
        return response.error(res, "User not found");
      }

      const newStatus = user.status === "Suspended" ? "Active" : "Suspended";
      user.status = newStatus;
      console.log("user", user);
      await user.save();

      return response.ok(res, {
        message: `User status updated to ${newStatus}`,
        user,
      });
    } catch (error) {
      console.error("Error suspending user:", error);
      return response.error(res, error.message || "Failed to suspend Customer");
    }
  },

  getCustomerDashboard: async (req, res) => {
    try {
      const { email, year, month } = req.body;

      if (!email) {
        return response.error(res, "Customer email is required");
      }

      const user = await User.findOne({ email: email });
      if (!user) {
        return response.error(res, "Customer not found");
      }

      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || new Date().getMonth() + 1;

      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      const yearOrders = await ProductRequest.find({
        user: user._id,
        createdAt: { $gte: yearStart, $lte: yearEnd },
      });

      const monthOrders = await ProductRequest.find({
        user: user._id,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });
      const ordersYear = yearOrders.length;
      const ordersMonth = monthOrders.length;

      const spentYear = yearOrders.reduce((totals, order) => {
        return totals + Number(order.total || 0);
      }, 0);

      const spentMonth = monthOrders.reduce((totals, order) => {
        return totals + Number(order.total || 0);
      }, 0);

      return response.ok(res, {
        message: "Customer dashboard data retrieved successfully",
        username: user.username || "User",
        lastname: user.lastName || "",
        email: user.email,
        ordersYear,
        ordersMonth,
        spentYear: Number(spentYear.toFixed(2)),
        spentMonth: Number(spentMonth.toFixed(2)),
        recentOrders: yearOrders.map((order) => ({
          orderId: order.orderId,
          status: order.status,
          amount: order.total || 0,
          date: order.createdAt,
        })),
      });
    } catch (error) {
      console.error(error);
      return response.error(
        res,
        error.message || "An error occurred while fetching dashboard data"
      );
    }
  },

  getAllCustomersStats: async (req, res) => {
    try {
      const { year, month } = req.body;
      const currentYear = year || new Date().getFullYear();

      const users = await User.find(
        {},
        "name firstName lastName email profileImage createdAt"
      );

      const customersWithStats = await Promise.all(
        users.map(async (user) => {
          const yearStart = new Date(currentYear, 0, 1);
          const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

          const userOrders = await ProductRequest.find({
            user: user._id,
            createdAt: { $gte: yearStart, $lte: yearEnd },
          });

          const totalSpent = userOrders.reduce((total, order) => {
            return total + (order.totalAmount || order.price || 0);
          }, 0);

          return {
            _id: user._id,
            name: user.name || user.firstName || "User",
            lastName: user.lastName || "",
            email: user.email,
            profileImage: user.profileImage,
            totalOrders: userOrders.length,
            totalSpent: totalSpent.toFixed(2),
            joinDate: user.createdAt,
          };
        })
      );

      return response.ok(res, {
        message: "All customers stats retrieved successfully",
        data: customersWithStats,
      });
    } catch (error) {
      console.error(error);
      return response.error(
        res,
        error.message || "An error occurred while fetching customers stats"
      );
    }
  },

  getCustomerOrderHistory: async (req, res) => {
    try {
      const { email, page = 1, limit = 10 } = req.body;

      if (!email) {
        return response.error(res, "Customer email is required");
      }

      const user = await User.findOne({ email: email });
      if (!user) {
        return response.error(res, "Customer not found");
      }

      const skip = (page - 1) * limit;

      const orders = await ProductRequest.find({ user: user._id })
        .populate("user", "name firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalOrders = await ProductRequest.countDocuments({
        user: user._id,
      });

      return response.ok(res, {
        message: "Customer order history retrieved successfully",
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            hasNext: skip + orders.length < totalOrders,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error(error);
      return response.error(
        res,
        error.message || "An error occurred while fetching order history"
      );
    }
  },

  // Register device for push notifications
  registerDevice: async (req, res) => {
    try {
      const { user, player_id, device_type } = req.body;

      if (!user || !player_id || !device_type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Upsert the device info
      const device = await Device.findOneAndUpdate(
        { player_id },
        { user, device_type, is_active: true, last_active: new Date() },
        { new: true, upsert: true }
      );

      res.status(200).json(device);
    } catch (error) {
      console.error("Error registering device:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get user devices
  getUserDevices: async (req, res) => {
    try {
      const userId = req.user.id;
      const devices = await Device.find({ user: userId, is_active: true });

      return response.ok(res, {
        message: "Devices retrieved successfully",
        devices,
      });
    } catch (error) {
      console.error("Get devices error:", error);
      return response.error(
        res,
        error.message || "An error occurred while fetching devices"
      );
    }
  },

  // Remove/deactivate device
  removeDevice: async (req, res) => {
    try {
      const { player_id } = req.body;
      const userId = req.user.id;

      if (!player_id) {
        return response.badrequest(res, "Player ID is required");
      }

      const device = await Device.findOne({ player_id, user: userId });

      if (!device) {
        return response.badrequest(res, "Device not found");
      }

      device.is_active = false;
      await device.save();

      return response.ok(res, {
        message: "Device removed successfully",
      });
    } catch (error) {
      console.error("Remove device error:", error);
      return response.error(
        res,
        error.message || "An error occurred while removing device"
      );
    }
  },

  // Test notification endpoint
  testNotification: async (req, res) => {
    try {
      const { userId, orderId } = req.body;

      if (!userId) {
        return response.badrequest(res, "User ID is required");
      }

      const result = await notify(
        userId,
        "Product Request",
        `Your product request with order ID ${orderId} has been received.`,
        orderId
      );

      console.log("Notification result:", result);

      return response.ok(res, {
        message: "Test notification sent successfully",
        data: {
          userId,
          orderId,
        },
      });
    } catch (error) {
      console.error("Test notification error:", error);
      return response.error(res, {
        message: error.message || "Failed to send test notification",
        error: error.toString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },

  changePasswordFOrAdmin: async (req, res) => {
    try {
      const { password, adminId } = req.body;

      let user = await User.findById(adminId);

      if (!user) {
        return response.error(res, { message: "User Id not found" });
      }

      if (user.type !== "ADMIN" && user.type !== "EMPLOYEE") {
        return response.error(res, {
          message: "Only admin and employee can change password",
        });
      }

      user.password = user.encryptPassword(password);
      await user.save();

      return response.ok(res, { message: "Password changed successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },
  changeBase64: async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: "URL is required" });

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch image");

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const ext = url.split(".").pop(); // jpeg/png
      res.json({ base64: `data:image/${ext};base64,${base64}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to convert image to base64" });
    }
  },

  downloadCustomerExcel: async (req, res) => {
    try {
      const users = await User.find().lean();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Customers");

      // Define headers
      worksheet.columns = [
        { header: "Name", key: "name", width: 30 },
        { header: "Email", key: "email", width: 40 },
        { header: "Phone Number", key: "phone", width: 20 },
      ];

      // Add rows
      users.forEach((p) => {
        let name = p.username;
        if (p.lastname) {
          name = p.username + " " + p.lastname;
        }
        worksheet.addRow({
          name,
          email: p.email,
          phone: p.number,
        });
      });

      const header = worksheet.getRow(1);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.alignment = { horizontal: "center", vertical: "middle" };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEA580C" }, // orange-500
      };

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: "middle" };
        }
        row.border = {
          top: { style: "thin", color: { argb: "FFD6D6D6" } },
          left: { style: "thin", color: { argb: "FFD6D6D6" } },
          bottom: { style: "thin", color: { argb: "FFD6D6D6" } },
          right: { style: "thin", color: { argb: "FFD6D6D6" } },
        };
      });

      // Send file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=products.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Excel export error:", err);
      res.status(500).json({ message: "Failed to generate Excel file" });
    }
  },
};
