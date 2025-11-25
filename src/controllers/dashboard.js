"use strict";
const response = require("../../src/responses");
const mongoose = require("mongoose");
const moment = require("moment");
const ProductRequest = require("@models/ProductRequest");
const User = require("@models/User");
const Product = require("@models/Product");

const calculateChange = (today, lastWeek) => {
  if (lastWeek === 0) return "100%";
  const diff = ((today - lastWeek) / lastWeek) * 100;
  const sign = diff >= 0 ? "+" : "-";
  return `${sign}${Math.abs(diff).toFixed(1)}%`;
};

module.exports = {
  getDashboardData: async (req, res) => {
    try {
      let cond = {};
      let productCond = {};
      let employeeCond = {};

      // If the user is a seller, add seller-specific filter
      if (req.user?.type === "SELLER") {
        cond = { seller_id: new mongoose.Types.ObjectId(req.user.id) };
        productCond = { userid: req.user.id };
        employeeCond = { parent_vendor_id: req.user.id };
      }

      const lastWeekStart = moment()
        .subtract(7, "days")
        .startOf("day")
        .toDate();
      const lastWeekEnd = moment().subtract(7, "days").endOf("day").toDate();
      const monthStart = moment().startOf("month").toDate();
      const lastMonthStart = moment()
        .subtract(1, "months")
        .startOf("month")
        .toDate();
      const lastMonthEnd = moment()
        .subtract(1, "months")
        .endOf("month")
        .toDate();
      const thisWeekStart = moment().startOf("isoWeek").toDate();
      const now = new Date();

      // 🧾 Transactions (sum of amount)
      const [thisWeekTxRaw] = await ProductRequest.aggregate([
        { $match: { createdAt: { $gte: thisWeekStart, $lte: now }, ...cond } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]);
      const thisWeekTx = thisWeekTxRaw || { total: 0 };

      const [lastWeekTxRaw] = await ProductRequest.aggregate([
        {
          $match: {
            createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
            ...cond,
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]);
      const lastWeekTx = lastWeekTxRaw || { total: 0 };

      const [totalTxRaw] = await ProductRequest.aggregate([
        { $match: { ...cond } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]);
      const totalTx = totalTxRaw || { total: 0 };

      // 📦 Orders (count or total field)
      const thisWeekOrders = await ProductRequest.countDocuments({
        createdAt: { $gte: thisWeekStart, $lte: now },
        ...cond,
      });
      const lastWeekOrders = await ProductRequest.countDocuments({
        createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
        ...cond,
      });
      const totalOrders = await ProductRequest.countDocuments(cond);

      console.log(thisWeekOrders, lastWeekOrders, totalOrders);

      // 👤 Users
      const thisMonthUsers = await User.countDocuments({
        createdAt: { $gte: monthStart },
        ...employeeCond,
      });
      const lastMonthUsers = await User.countDocuments({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        ...employeeCond,
      });
      const totalUsers = await User.countDocuments(employeeCond);

      // 🛒 Products
      const thisMonthProducts = await Product.countDocuments({
        createdAt: { $gte: monthStart },
        ...productCond,
      });
      const lastMonthProducts = await Product.countDocuments({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        ...productCond,
      });
      const totalProducts = await Product.countDocuments(productCond);

      return response.success(res, {
        transactions: {
          total: Number(totalTx.total.toFixed(2)),
          change: calculateChange(thisWeekTx.total, lastWeekTx.total),
        },
        orders: {
          total: Number(totalOrders),
          // thisWeek: Number(thisWeekOrders),
          // lastWeek: Number(lastWeekOrders),
          change: calculateChange(thisWeekOrders, lastWeekOrders),
        },
        users: {
          total: Number(totalUsers),
          // thisMonth: Number(thisMonthUsers),
          // lastMonth: Number(lastMonthUsers),
          change: calculateChange(thisMonthUsers, lastMonthUsers),
        },
        products: {
          total: Number(totalProducts),
          // thisMonth: Number(thisMonthProducts),
          // lastMonth: Number(lastMonthProducts),
          change: calculateChange(thisMonthProducts, lastMonthProducts),
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return response.error(res, error);
    }
  },

  getMonthlyProductSales: async (req, res) => {
    try {
      const currentYear = moment().year();
      let cond = {};

      if (req.user?.type === "SELLER") {
        cond = { seller_id: new mongoose.Types.ObjectId(req.user.id) };
      }

      const monthlySales = await ProductRequest.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(`${currentYear}-01-01`),
              $lte: new Date(`${currentYear}-12-31`),
            },
            ...cond,
          },
        },
        {
          $project: {
            month: { $month: "$createdAt" }, // Extract the month from createdAt
          },
        },
        {
          $group: {
            _id: "$month",
            total: { $sum: 1 }, // or use "$sum: '$quantity'" if quantity field exists
          },
        },
        {
          $sort: { _id: 1 }, // Sort by month
        },
      ]);

      const salesByMonth = Array(12).fill(0);

      monthlySales.forEach((sale) => {
        salesByMonth[sale._id - 1] = sale.total;
      });

      return response.success(res, {
        categories: moment.monthsShort(),
        series: [
          {
            name: "Product Sales",
            data: salesByMonth,
          },
        ],
      });
    } catch (err) {
      console.error(err);
      return response.error(res, err);
    }
  },

  getTopProductSales: async (req, res) => {
    try {
      const topLimit = 5;

      let cond = {};

      if (req.user?.type === "SELLER") {
        cond = { seller_id: new mongoose.Types.ObjectId(req.user.id) };
      }

      const sales = await ProductRequest.aggregate([
        { $match: { ...cond } },
        { $unwind: "$productDetail" },
        {
          $group: {
            _id: "$productDetail.product",
            totalSales: {
              $sum: {
                $multiply: ["$productDetail.price", "$productDetail.qty"],
              },
            },
          },
        },
        { $sort: { totalSales: -1 } },
        { $limit: topLimit },
      ]);

      const othersSales = await ProductRequest.aggregate([
        { $match: { ...cond } },
        { $unwind: "$productDetail" },
        {
          $group: {
            _id: "$productDetail.product",
            totalSales: {
              $sum: {
                $multiply: ["$productDetail.price", "$productDetail.qty"],
              },
            },
          },
        },
        { $sort: { totalSales: -1 } },
      ]);

      const totalSales = othersSales
        .slice(topLimit)
        .reduce((acc, item) => acc + item.totalSales, 0);

      const productIds = sales.map((item) => item._id);
      const products = await Product.find({ _id: { $in: productIds } }).lean();

      const productNameMap = products.reduce((map, product) => {
        map[product._id.toString()] = product.name;
        return map;
      }, {});

      const labels = sales.map(
        (item) => productNameMap[item._id.toString()] || "Unknown"
      );
      const series = sales.map((item) => item.totalSales);

      if (totalSales > 0) {
        labels.push("Others");
        series.push(totalSales);
      }

      return response.success(res, {
        categories: labels,
        series: series,
      });
    } catch (err) {
      console.error("Error fetching top product sales:", err);
      return response.error(res, err);
    }
  },

  getDailyTopSellingProduct: async (req, res) => {
    try {
      if (!req.user?.id || req.user?.type !== "SELLER") {
        return response.error(res, "Unauthorized or not a seller");
      }

      const sellerId = new mongoose.Types.ObjectId(req.user.id);

      // Calculate 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 9); // includes today
      tenDaysAgo.setHours(0, 0, 0, 0);

      const topDailyProducts = await ProductRequest.aggregate([
        {
          $match: {
            seller_id: sellerId,
            createdAt: { $gte: tenDaysAgo },
          },
        },
        { $unwind: "$productDetail" },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              product: "$productDetail.product",
            },
            totalQty: { $sum: "$productDetail.qty" },
          },
        },
        { $sort: { "_id.date": 1, totalQty: -1 } },
        {
          $group: {
            _id: "$_id.date",
            productId: { $first: "$_id.product" },
            totalQty: { $first: "$totalQty" },
          },
        },
        { $sort: { _id: -1 } }, // latest date first
        { $limit: 10 }, // only last 10 days
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $project: {
            date: "$_id",
            productId: 1,
            totalQty: 1,
            productInfo: 1,
          },
        },
      ]);

      return response.success(res, topDailyProducts);
    } catch (err) {
      console.error("Error fetching daily top-selling products:", err);
      return response.error(res, err.message || "Internal Server Error");
    }
  },
};
