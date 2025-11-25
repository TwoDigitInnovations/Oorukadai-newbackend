const mongoose = require("mongoose");
const Product = require("@models/Product");
const ProductRequest = require("@models/ProductRequest");
const User = require("@models/User");
const Tax = require("@models/Tax");
const Servicefee = require("@models/Servicefee");
const response = require("../responses");
const mailNotification = require("../services/mailNotification");
const { notify } = require("../services/notification");
// const { User } = require("@onesignal/node-onesignal");
const Review = require("@models/Review");
const Favourite = require("@models/Favorite");
const Category = require("@models/Category");
const { getReview } = require("../../src/helper/user");

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

module.exports = {
  // createProduct: async (req, res) => {
  //   try {
  //     const payload = req?.body || {};
  //     payload.slug = payload.name
  //       .toLowerCase()
  //       .replace(/ /g, "-")
  //       .replace(/[^\w-]+/g, "");
  //     let cat = new Product(payload);
  //     await cat.save();
  //     return response.success(res, { message: "Product added successfully" });
  //   } catch (error) {
  //     return response.error(res, error);
  //   }
  // },

createProduct: async (req, res) => {
    try {
        const payload = req?.body || {};
        
        const parseJSONField = (field, defaultValue = []) => {
            if (field && typeof field === 'string') {
                try {
                    return JSON.parse(field);
                } catch (e) {
                    console.log(`Error parsing ${field}:`, e.message);
                    return defaultValue;
                }
            }
            return field || defaultValue;
        };

        payload.price_slot = parseJSONField(payload.price_slot, []);
        payload.attributes = parseJSONField(payload.attributes, []);
        payload.varients = parseJSONField(payload.varients, []);
        
        // Handle hasVariants flag
        payload.hasVariants = payload.hasVariants === 'true' || payload.hasVariants === true;
        
        if (payload.category && typeof payload.category === 'string') {
            payload.category = payload.category.trim();
        }
        
        // Handle images from file uploads
        let uploadedImages = [];
        if (req.files && req.files.length > 0) {
            uploadedImages = req.files.map(file => file.path);
            console.log('Uploaded images from files:', uploadedImages);
        }
        
        // Handle images from URLs (for normal products)
        let urlImages = [];
        if (payload.imageUrls) {
            urlImages = parseJSONField(payload.imageUrls, []);
            console.log('Images from URLs:', urlImages);
        }
        
        // Combine both file uploads and URL images
        payload.images = [...uploadedImages, ...urlImages];
        console.log('Final images array:', payload.images);
        
        if (payload.name) {
            payload.slug = payload.name
                .toLowerCase()
                .trim()
                .replace(/ /g, "-")
                .replace(/[^\w-]+/g, "");
        }

        // Generate SKU if not provided
        if (!payload.sku) {
            const prefix = payload.name.substring(0, 3).toUpperCase();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            payload.sku = `${prefix}-${randomNum}`;
        }

        // Ensure stock is a number
        if (payload.stock) {
            payload.stock = parseInt(payload.stock, 10) || 0;
        } else {
            payload.stock = 0;
        }

        // Ensure model is a string
        if (payload.model) {
            payload.model = payload.model.toString();
        } else {
            payload.model = "";
        }

        // Validate pricing based on product type
        if (payload.hasVariants) {
            // For variant products, ensure each variant has pricing
            if (!payload.varients || payload.varients.length === 0) {
                return response.error(res, {
                    message: 'Products with variants must have at least one variant'
                }, 400);
            }
            
            // Validate each variant has price
            for (let variant of payload.varients) {
                if (!variant.price || variant.price <= 0) {
                    return response.error(res, {
                        message: 'Each variant must have a valid price'
                    }, 400);
                }
            }
        } else {
            // For normal products, ensure price_slot has pricing
            if (!payload.price_slot || payload.price_slot.length === 0 || !payload.price_slot[0].price) {
                return response.error(res, {
                    message: 'Normal products must have a price'
                }, 400);
            }
        }

        console.log('Final payload:', payload);
        
        let product = new Product(payload);
        const savedProduct = await product.save();
        
        console.log('Product saved:', savedProduct._id);
        
        return response.success(res, { 
            message: "Product added successfully",
            product: savedProduct
        });
        
    } catch (error) {
        console.error('Product creation error:', error);
        
        if (error.name === 'ValidationError') {
            return response.error(res, {
                message: 'Validation failed',
                details: error.errors
            }, 400);
        }
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return response.error(res, {
                message: 'File size too large. Maximum 10MB allowed.'
            }, 400);
        }
        
        return response.error(res, {
            message: 'Internal server error',
            error: error.message
        }, 500);
    }
},

 getProduct: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const skip = (page - 1) * limit;

      
      const cacheKey = `products_page${page}_limit${limit}_seller${req.query.seller_id || 'all'}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
        console.log('Returning cached products');
        return res.status(200).json(cachedData.data);
      }

    
      let query = {
        // For non-admin users, only show verified and non-suspended products
        status: "verified",
        is_verified: true
      };
      
      // For admin users, show all products except suspended ones by default
      if (req.user && req.user.role === 'admin') {
        delete query.is_verified;
        delete query.status;
        // Only filter out suspended products if not specifically requested
        if (req.query.include_suspended !== 'true') {
          query.status = { $ne: 'suspended' };
        }
      }
      
      if (req.query.seller_id) {
        query.userid = req.query.seller_id;
      }

      
      const products = await Product.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
            pipeline: [{ $project: { name: 1, slug: 1 } }]
          }
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            images: 1,
            short_description: 1,
            price_slot: 1,
            sold_pieces: 1,
            category: 1,
            varients: 1,
            is_verified: 1,
            sponsered: 1,
            createdAt: 1,
            userid: 1
          }
        }
      ]);

      // Get total count efficiently
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);

      const responseData = {
        status: true,
        data: products,
        pagination: {
          totalItems: totalProducts,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      };

      // Cache the response
      cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      console.log('Returning fresh products data');
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('getProduct error:', error);
      return response.error(res, error);
    }
  },

  getProductforseller: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      // let data = {}
      // if (req.query.seller_id) {
      //     data.userid = req.query.seller_id
      // }
      let product = await Product.find({ userid: req.user.id })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getSponseredProduct: async (req, res) => {
    try {
      let data = { sponsered: true };
      if (req.query.seller_id) {
        data.userid = req.query.seller_id;
      }
      let product = await Product.find(data)
        .populate("category")
        .sort({ createdAt: -1 });
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getProductByslug: async (req, res) => {
    try {
      let product = await Product.findOne({ slug: req?.params?.id }).populate(
        "category",
        "name slug"
      );
      
      // Check if product exists before accessing its properties
      if (!product) {
        return response.error(res, { 
          message: "Product not found", 
          status: 404 
        });
      }
      
      let reviews = await Review.find({ product: product._id }).populate(
        "posted_by",
        "username"
      );
      let favourite;
      if (req.query.user) {
        favourite = await Favourite.findOne({
          product: product._id,
          user: req.query.user,
        });
      }
      let d = {
        ...product._doc,
        rating: await getReview(product._id),
        reviews,
        favourite: favourite ? true : false,
      };
      return response.success(res, d);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getProductById: async (req, res) => {
    try {
      let product = await Product.findById(req?.params?.id).populate(
        "category",
        "name"
      );
      // let reviews = await Review.find({ product: product._id }).populate('posted_by', 'username')
      // let favourite
      // if (req.query.user) {
      //     favourite = await Favourite.findOne({ product: product._id, user: req.query.user })
      // }
      // let d = {
      //     ...product._doc,
      //     rating: await getReview(product._id),
      //     reviews,
      //     favourite: favourite ? true : false
      // }
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  compareProduct: async (req, res) => {
    try {
      let product = await Product.find({ _id: { $in: req.body.ids } }).populate(
        "category"
      );
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  getProductbycategory: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      let product = await Product.find({ category: req.params.id })
        .populate("category")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getProductBycategoryId: async (req, res) => {
    console.log(req.query);
    try {
      let cond = {
        // For non-admin users, only show verified and non-suspended products
        status: "verified",
        is_verified: true
      };

      // For admin users, show all products except suspended ones by default
      if (req.user && req.user.role === 'admin') {
        delete cond.is_verified;
        delete cond.status;
        // Only filter out suspended products if not specifically requested
        if (req.query.include_suspended !== 'true') {
          cond.status = { $ne: 'suspended' };
        }
      }

      // Filter by category
      if (req?.query?.category && req?.query?.category !== "all") {
        const cat = await Category.findOne({
          slug: req?.query?.category,
        }).lean();
        if (cat) cond.category = cat._id;
      }

      // Exclude specific product
      if (req?.query?.product_id) {
        cond._id = { $ne: req?.query?.product_id };
      }

      // Filter by new
      if (req.query.is_new) {
        cond.is_new = true;
      }

      // Filter by colors
      if (req.query.colors && req.query.colors.length > 0) {
        cond.varients = {
          $ne: [],
          $elemMatch: { color: { $in: req.query.colors } },
        };
      }

      // Pagination config
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const skip = (page - 1) * limit;

      // Fetch all matching products first
      let products = await Product.find(cond).populate("category").lean();

      // Manual sort
      const sortBy = req.query.sort_by;
      if (sortBy === "low") {
        products = products.sort((a, b) => {
          const aPrice = parseFloat(a.price_slot?.[0]?.our_price) || 0;
          const bPrice = parseFloat(b.price_slot?.[0]?.our_price) || 0;
          return aPrice - bPrice;
        });
      } else if (sortBy === "high") {
        products = products.sort((a, b) => {
          const aPrice = parseFloat(a.price_slot?.[0]?.our_price) || 0;
          const bPrice = parseFloat(b.price_slot?.[0]?.our_price) || 0;
          return bPrice - aPrice;
        });
      } else if (sortBy === "a_z") {
        products = products.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === "z_a") {
        products = products.sort((a, b) => b.name.localeCompare(a.name));
      } else if (sortBy === "old") {
        products = products.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      } else {
        // Default or "new", "featured", "is_top"
        products = products.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      }

      // Slice products for pagination after sorting
      const totalProducts = products.length;
      const totalPages = Math.ceil(totalProducts / limit);
      const paginatedProducts = products.slice(skip, skip + limit);

      return res.status(200).json({
        status: true,
        data: paginatedProducts,
        pagination: {
          totalItems: totalProducts,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getProductBythemeId: async (req, res) => {
    console.log(req.query);
    try {
      let cond = {
        theme: { $in: [req?.params?.id] },
      };
      let sort_by = {};
      if (req.query.is_top) {
        cond.is_top = true;
      }
      if (req.query.is_new) {
        cond.is_new = true;
      }

      if (req.query.colors && req.query.colors.length > 0) {
        cond.varients = {
          $ne: [],
          $elemMatch: { color: { $in: req.query.colors } },
        };
      }

      if (req.query.sort_by) {
        if (req.query.sort_by === "featured" || req.query.sort_by === "new") {
          sort_by.createdAt = -1;
        }

        if (req.query.sort_by === "old") {
          sort_by.createdAt = 1;
        }

        if (req.query.sort_by === "a_z") {
          sort_by.name = 1;
        }

        if (req.query.sort_by === "z_a") {
          sort_by.name = -1;
        }

        if (req.query.sort_by === "low") {
          sort_by.price = 1;
        }

        if (req.query.sort_by === "high") {
          sort_by.price = -1;
        }
      } else {
        sort_by.createdAt = -1;
      }
      const product = await Product.find(cond).populate("theme").sort(sort_by);
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  getColors: async (req, res) => {
    try {
      let product = await Product.aggregate([
        { $unwind: "$varients" },
        {
          $group: {
            _id: null, // We don't need to group by a specific field, so use null
            uniqueColors: { $addToSet: "$varients.color" }, // $addToSet ensures uniqueness
          },
        },
        {
          $project: {
            _id: 0, // Exclude _id from the output
            uniqueColors: 1,
          },
        },
      ]);

      return response.success(res, product[0]);
    } catch (error) {
      return response.error(res, error);
    }
  },

updateProduct: async (req, res) => {
    try {
        const payload = req?.body || {};
        
        // Parse JSON strings back to objects/arrays
        if (payload.price_slot && typeof payload.price_slot === 'string') {
            try {
                payload.price_slot = JSON.parse(payload.price_slot);
            } catch (e) {
                payload.price_slot = [];
            }
        }
        
        if (payload.attributes && typeof payload.attributes === 'string') {
            try {
                payload.attributes = JSON.parse(payload.attributes);
            } catch (e) {
                payload.attributes = [];
            }
        }
        
        if (payload.category) {
            if (typeof payload.category === 'string' && !payload.category.match(/^[0-9a-fA-F]{24}$/)) {
                delete payload.category;
            }
        }
        
        if (payload.varients && typeof payload.varients === 'string') {
            try {
                payload.varients = JSON.parse(payload.varients);
            } catch (e) {
                payload.varients = [];
            }
        }
        
        // Handle hasVariants flag
        payload.hasVariants = payload.hasVariants === 'true' || payload.hasVariants === true;
        
        // Parse JSON helper
        const parseJSONField = (field, defaultValue = []) => {
            if (field && typeof field === 'string') {
                try {
                    return JSON.parse(field);
                } catch (e) {
                    return defaultValue;
                }
            }
            return field || defaultValue;
        };
        
        // Handle images from file uploads
        let uploadedImages = [];
        if (req.files && req.files.length > 0) {
            uploadedImages = req.files.map(file => file.path);
        }
        
        // Handle images from URLs (for normal products)
        let urlImages = [];
        if (payload.imageUrls) {
            urlImages = parseJSONField(payload.imageUrls, []);
        }
        
        // Combine both file uploads and URL images
        if (uploadedImages.length > 0 || urlImages.length > 0) {
            payload.images = [...uploadedImages, ...urlImages];
        }
        
        if (payload.name) {
            payload.slug = payload.name
                .toLowerCase()
                .replace(/ /g, "-")
                .replace(/[^\w-]+/g, "");
        }
        
        // Validate pricing based on product type
        if (payload.hasVariants) {
            if (!payload.varients || payload.varients.length === 0) {
                return response.error(res, {
                    message: 'Products with variants must have at least one variant'
                }, 400);
            }
            
            for (let variant of payload.varients) {
                if (!variant.price || variant.price <= 0) {
                    return response.error(res, {
                        message: 'Each variant must have a valid price'
                    }, 400);
                }
            }
        } else {
            if (!payload.price_slot || payload.price_slot.length === 0 || !payload.price_slot[0].price) {
                return response.error(res, {
                    message: 'Normal products must have a price'
                }, 400);
            }
        }
        
        let product = await Product.findByIdAndUpdate(payload?.id, payload, {
            new: true,
            upsert: true,
        });
        
        return response.success(res, product);
    } catch (error) {
        return response.error(res, error);
    }
},

  // Generate delivery label for a sold product
  generateDeliveryLabel: async (req, res) => {
    try {
      const { productId, orderId, customerName, customerAddress, customerPhone } = req.body;
      
      const product = await Product.findById(productId);
      if (!product) {
        return response.error(res, { message: 'Product not found' }, 404);
      }

      // Create delivery label content
      const deliveryLabel = {
        orderId,
        productName: product.name,
        productSKU: product.sku,
        productModel: product.model,
        customerName,
        customerAddress,
        customerPhone,
        shippingDate: new Date(),
        trackingNumber: `TRK-${Date.now()}`
      };

      // Update product with delivery label
      product.deliveryLabel = JSON.stringify(deliveryLabel);
      await product.save();

      // Invalidate cache
      cache.delete('products');

      return response.success(res, { 
        message: 'Delivery label generated successfully',
        deliveryLabel: deliveryLabel,
        printUrl: `/api/products/${productId}/delivery-label/print`
      });
    } catch (error) {
      console.error('Error generating delivery label:', error);
      return response.error(res, { message: 'Error generating delivery label' });
    }
  },

  // Print delivery label
  printDeliveryLabel: async (req, res) => {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId);
      
      if (!product || !product.deliveryLabel) {
        return response.error(res, { message: 'Delivery label not found' }, 404);
      }

      const label = JSON.parse(product.deliveryLabel);
      
      // Set content type to PDF for printing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=delivery-${label.orderId}.pdf`);
      
      // Here you would typically use a PDF generation library like pdfkit or puppeteer
      // This is a simplified example
      res.send(`
        <html>
          <head>
            <title>Delivery Label - ${label.orderId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .label { border: 1px solid #000; padding: 15px; max-width: 500px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; }
              .section { margin-bottom: 15px; }
              .section-title { font-weight: bold; margin-bottom: 5px; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="header">
                <h2>SHIPPING LABEL</h2>
                <p>Order #${label.orderId} | ${new Date(label.shippingDate).toLocaleDateString()}</p>
              </div>
              
              <div class="section">
                <div class="section-title">SHIP TO:</div>
                <div>${label.customerName}</div>
                <div>${label.customerAddress}</div>
                <div>Phone: ${label.customerPhone}</div>
              </div>
              
              <div class="section">
                <div class="section-title">PRODUCT DETAILS:</div>
                <div>${label.productName}</div>
                <div>SKU: ${label.productSKU}</div>
                <div>Model: ${label.productModel}</div>
              </div>
              
              <div class="section">
                <div class="section-title">TRACKING #:</div>
                <div>${label.trackingNumber}</div>
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error printing delivery label:', error);
      return response.error(res, { message: 'Error printing delivery label' });
    }
  },

  topselling: async (req, res) => {
    try {
      let product = await Product.find({ is_top: true });
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getnewitem: async (req, res) => {
    try {
      let product = await Product.find({ is_new: true });
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteProduct: async (req, res) => {
    try {
      await Product.findByIdAndDelete(req?.params?.id);
      return response.success(res, { meaasge: "Deleted successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteAllProduct: async (req, res) => {
    try {
      const newid = req.body.products.map(
        (f) => new mongoose.Types.ObjectId(f)
      );
      await Product.deleteMany({ _id: { $in: newid } });
      return response.success(res, { meaasge: "Deleted successfully" });
    } catch (error) { 
      return response.error(res, error);
    }
  },

  requestProduct: async (req, res) => {
      console.log("=== API HIT ===");
    console.log("Request body:", req.body);
    console.log("User ID:", req.user?.id);
    try {
      
      const payload = req?.body || {};
      const sellersNotified = new Set();
      const sellerOrders = {};

      const productIds = payload.productDetail.map((item) => item.product);
      const products = await Product.find({ _id: { $in: productIds } }).select(
        "category"
      );
      const categoryIds = products.map((p) => p.category);
      const categories = await Category.find({
        _id: { $in: categoryIds },
      }).select("is_refundable");

      const productCategoryMap = new Map();
      products.forEach((product) => {
        const category = categories.find((c) => c._id.equals(product.category));
        productCategoryMap.set(
          product._id.toString(),
          !(category?.is_refundable ?? true)
        );
      });

      for (const item of payload.productDetail) {
        const sellerId = item.seller_id?.toString();
        if (!sellerId) return;

        if (!sellerOrders[sellerId]) {
          sellerOrders[sellerId] = {
            user: req.user.id,
            seller_id: sellerId,
            status: "Pending",
            productDetail: [],
            shipping_address: payload.shipping_address,
            total: 0,
            location: payload.location,
            paymentmode: payload.paymentmode,
            timeslot: payload.timeslot,
            deliveryCharge: payload.deliveryCharge,
            deliveryTip: payload.deliveryTip
          };
        }

        if (!sellersNotified.has(sellerId)) {
          await notify(
            sellerId,
            "Order received",
            "You have received a new order"
          );
          sellersNotified.add(sellerId);
        }

        const isReturnable = productCategoryMap.get(item.product.toString());

        sellerOrders[sellerId].productDetail.push({
          product: item.product,
          image: item.image,
          qty: item.qty,
          price: item.price,
          price_slot: item.price_slot,
          isReturnable,
        });

        // Calculate total price for this product
        sellerOrders[sellerId].total += item.qty * item.price;
      }

      const savedOrders = [];
      for (const sellerId in sellerOrders) {
        // Calculate tax before saving
        const taxData = await Tax.findOne();
        const feeData = await Servicefee.findOne();
        const taxRate = taxData?.taxRate || 0;
        const baseTotal = sellerOrders[sellerId].total;
        const taxAmount = (baseTotal * taxRate) / 100;
        const deliveryCharge = sellerOrders[sellerId].deliveryCharge || 0;
        const deliveryTip = sellerOrders[sellerId].deliveryTip || 0;

        sellerOrders[sellerId].tax = taxAmount;
        sellerOrders[sellerId].servicefee = feeData?.Servicefee;
        sellerOrders[sellerId].total = baseTotal;
        sellerOrders[sellerId].finalAmount = baseTotal + taxAmount + deliveryCharge + deliveryTip;
        // sellerOrders[sellerId].total = baseTotal + taxAmount;

        const newOrder = new ProductRequest(sellerOrders[sellerId]);
        console.log('🚀 Creating order for seller:', sellerId);
        const savedOrder = await newOrder.save();
        savedOrders.push(savedOrder);
        console.log('✅ Order created successfully. Order ID:', savedOrder._id);
        
        // Generate delivery label for each product in the order
        console.log('📦 Starting delivery label generation for order items:', sellerOrders[sellerId].productDetail.length);
        
        for (const [index, item] of sellerOrders[sellerId].productDetail.entries()) {
            try {
                console.log(`\n🔍 Processing product ${index + 1}/${sellerOrders[sellerId].productDetail.length}:`);
                console.log('   - Product ID:', item.product);
                console.log('   - Product Name:', item.name || 'N/A');
                
                const deliveryLabelData = {
                    orderId: savedOrder._id,
                    productName: item.name || 'Product',
                    productSKU: item.sku || 'N/A',
                    productModel: item.model || 'N/A',
                    customerName: payload.shipping_address?.name || 'Customer',
                    customerAddress: `${payload.shipping_address?.address || ''}, ${payload.shipping_address?.city || ''}`.trim(),
                    customerPhone: payload.shipping_address?.phone || 'N/A',
                    shippingDate: new Date(),
                    trackingNumber: `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                };
                
                console.log('📝 Delivery label data:', JSON.stringify(deliveryLabelData, null, 2));
                
                const updatedProduct = await Product.findByIdAndUpdate(
                    item.product,
                    { $set: { deliveryLabel: JSON.stringify(deliveryLabelData) } },
                    { new: true }
                );
                
                if (updatedProduct) {
                    console.log('✅ Successfully updated product with delivery label');
                    console.log('   - Product after update:', {
                        _id: updatedProduct._id,
                        name: updatedProduct.name,
                        hasDeliveryLabel: !!updatedProduct.deliveryLabel,
                        deliveryLabelLength: updatedProduct.deliveryLabel ? updatedProduct.deliveryLabel.length : 0
                    });
                } else {
                    console.error('❌ Failed to update product - Product not found');
                }
            } catch (error) {
                console.error('❌ Error generating delivery label for product:', {
                    productId: item.product,
                    error: error.message,
                    stack: error.stack
                });
                // Continue with other products even if one fails
            }
        }

        // Update sold_pieces for each product
        for (const productItem of sellerOrders[sellerId].productDetail) {
          await Product.findByIdAndUpdate(
            productItem.product,
            { $inc: { sold_pieces: productItem.qty } }, // Increment sold_pieces
            { new: true }
          );
        }

      
        if (payload.paymentmode === "pay" || payload.paymentmode === "cod") {
          const orderTotal = Number(sellerOrders[sellerId].total);
          const adminFee = (orderTotal * 2) / 100;
          const sellerEarnings = orderTotal - adminFee;

         
          await User.findByIdAndUpdate(
            sellerId,
            { $inc: { wallet: sellerEarnings } },
            { new: true, upsert: true }
          );

         
          const adminUser = await User.findOne({ role: 'admin' });
          if (adminUser) {
            await User.findByIdAndUpdate(
              adminUser._id,
              { $inc: { cashReceive: adminFee } },
              { new: true }
            );
          }

          // Persist commission details on the order
          await ProductRequest.findByIdAndUpdate(
            newOrder._id,
            {
              $set: {
                adminFee: adminFee,
                sellerEarnings: sellerEarnings,
              },
            }
          );
        }
      }

      // if (payload.shiping_address) {
      //     await User.findByIdAndUpdate(req.user.id, { shiping_address: payload.shiping_address })
      // }

      if (payload.shipping_address) {
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id,
          {
            shipping_address: payload.shipping_address,
            location: payload.location,
          },
          { new: true, runValidators: true }
        );

        if (!updatedUser) {
          return response.error(res, { message: "User not found" });
        }
      }

      if (payload.user && payload.pointtype === "REDEEM") {
        let userdata = await User.findById(payload.user);
        // if (payload.pointtype === "REDEEM") {
        userdata.referalpoints = userdata.referalpoints - Number(payload.point);
        userdata.save();
        // }
        // else {
        //   userdata.point = userdata.point + Number(payload.point);
        //   userdata.save();
        // }
      }

      return res.status(200).json({
  status: true,
  success: true,
  message: "Product request added successfully",
  orders: savedOrders,
});
    } catch (error) {
     return res.status(500).json({
  status: false,
  success: false,
  message: error.message || "Internal Server Error",
  error,
});
    }
  },


createProductRequest: async (req, res) => {
    console.log("🚀 createProductRequest Backend API called");
    console.log("📦 Request body:", req.body);
    console.log("👤 User:", req.user);
    
    try {
       
        req.setTimeout(60000); 
        
        const payload = req?.body || {};
        
        
        if (!req.user || !req.user.id) {
            console.error("❌ No authenticated user found");
            return res.status(401).json({
                status: false,
                success: false,
                message: "Authentication required"
            });
        }
        
        
        
        const sellersNotified = new Set();
        const sellerOrders = {};

        const productIds = payload.productDetail.map((item) => item.product);
       
        
        const products = await Product.find({ _id: { $in: productIds } }).select("category").lean();
      
        
        const categoryIds = products.map((p) => p.category);
       
        
        const categories = await Category.find({
            _id: { $in: categoryIds },
        }).select("is_refundable").lean();
        
        const productCategoryMap = new Map();
        products.forEach((product) => {
            const category = categories.find((c) => c._id.equals(product.category));
            productCategoryMap.set(
                product._id.toString(),
                !(category?.is_refundable ?? true)
            );
        });

      
        
        for (const item of payload.productDetail) {
          
            let sellerId = item.seller_id?.toString();
           
            
            
            if (!sellerId || sellerId === 'FETCH_FROM_PRODUCT') {
               
                try {
                    // Also select potential legacy field 'user' besides 'userid'
                    const product = await Product.findById(item.product).select('userid user seller_id user_id owner_id').lean();
                    if (product) {
                        sellerId = product.userid || product.user || product.seller_id || product.user_id || product.owner_id;
                    } else {
                        console.error("❌ Product not found:", item.product);
                    }
                } catch (productError) {
                    console.error("❌ Error fetching product:", productError);
                }
            }
            
            if (!sellerId) {
                console.warn("⚠️ No seller_id found for product:", item.product, "- skipping");
                continue;
            }
            
            sellerId = sellerId.toString();

            if (!sellerOrders[sellerId]) {
              sellerOrders[sellerId] = {
        user: req.user.id,
        seller_id: sellerId,
        status: "Pending",
        productDetail: [],
        shipping_address: payload.shipping_address,
        total: 0,
        paymentmode: payload.paymentmode,
        timeslot: payload.timeslot,
        deliveryCharge: payload.deliveryCharge || 0,
        deliveryTip: payload.deliveryTip || 0
    };
            }

            if (!sellersNotified.has(sellerId)) {
                try {
                    await notify(
                        sellerId,
                        "Order received",
                        "You have received a new order"
                    );
                    sellersNotified.add(sellerId);

                } catch (notifyError) {
                  
                    
                }
            }

            const isReturnable = productCategoryMap.get(item.product.toString());

            sellerOrders[sellerId].productDetail.push({
                product: item.product,
                image: item.image,
                qty: item.qty,
                price: item.price,
                price_slot: item.price_slot,
                isReturnable,
                color: item.color,
                name: item.name,
                size: item.size
            });

          
            sellerOrders[sellerId].total += item.qty * item.price;
        }

       
        
        const savedOrders = [];
        
        console.log("🔄 Processing orders for sellers:", Object.keys(sellerOrders));
        
        for (const sellerId in sellerOrders) {
            console.log(`🛍️ Processing order for seller: ${sellerId}`);
            
            try {
              
                const taxData = await Tax.findOne();
                const feeData = await Servicefee.findOne();
                const taxRate = taxData?.taxRate || 0;
                const baseTotal = sellerOrders[sellerId].total;
                const taxAmount = (baseTotal * taxRate) / 100;
                const deliveryCharge = sellerOrders[sellerId].deliveryCharge || 0;
                const deliveryTip = sellerOrders[sellerId].deliveryTip || 0;

                sellerOrders[sellerId].tax = taxAmount;
                sellerOrders[sellerId].servicefee = feeData?.Servicefee || 0;
                sellerOrders[sellerId].total = baseTotal;
                sellerOrders[sellerId].finalAmount = baseTotal + taxAmount + deliveryCharge + deliveryTip;

                const newOrder = new ProductRequest(sellerOrders[sellerId]);
                console.log("📝 Creating new order with data:", JSON.stringify(sellerOrders[sellerId], null, 2));
                
                const savedOrder = await newOrder.save();
                console.log("✅ Order saved successfully with ID:", savedOrder._id);
               
                
                savedOrders.push(savedOrder);
                

                for (const productItem of sellerOrders[sellerId].productDetail) {
                    await Product.findByIdAndUpdate(
                        productItem.product,
                        { $inc: { sold_pieces: productItem.qty } },
                        { new: true }
                    );
                }

                
                console.log(`💰 Processing commission for seller: ${sellerId}`);
                console.log(`💰 Payment mode: ${payload.paymentmode}`);
                console.log(`💰 Order total: ${sellerOrders[sellerId].total}`);
                
                if (payload.paymentmode === "pay" || payload.paymentmode === "cod") {
                    const orderTotal = Number(sellerOrders[sellerId].total);
                    const adminFee = (orderTotal * 2) / 100; // Calculate 2% admin fee
                    const sellerEarnings = orderTotal - adminFee; // Deduct admin fee from seller's earnings
                    
                    console.log(`💰 Calculated admin fee: ${adminFee}`);
                    console.log(`💰 Calculated seller earnings: ${sellerEarnings}`);
                    
                    // Update seller's wallet with the remaining amount (98%)
                    const sellerUpdate = await User.findByIdAndUpdate(
                        sellerId,
                        { $inc: { wallet: sellerEarnings } },
                        { new: true, upsert: true }
                    );
                    console.log(`💰 Seller wallet updated: ${sellerUpdate?.wallet}`);
                    
                    // Find admin user and update their cash receive amount
                    const adminUser = await User.findOne({ role: 'admin' });
                    if (adminUser) {
                        const adminUpdate = await User.findByIdAndUpdate(
                            adminUser._id,
                            { $inc: { cashReceive: adminFee } },
                            { new: true }
                        );
                        console.log(`💰 Admin commission updated: ${adminUpdate?.cashReceive}`);
                    }
                    
                    // Add admin fee to the order document for record keeping
                    await ProductRequest.findByIdAndUpdate(
                        savedOrder._id,
                        { 
                            $set: { 
                                adminFee: adminFee,
                                sellerEarnings: sellerEarnings
                            } 
                        }
                    );
                    console.log(`💰 Order document updated with commission data`);
                } else {
                    console.log(`💰 Commission not applied - payment mode: ${payload.paymentmode}`);
                }
            } catch (orderError) {
                console.error("❌ Error saving order for seller:", sellerId, orderError);
                throw orderError; 
            }
        }

        if (payload.shipping_address) {
            try {
                const updatedUser = await User.findByIdAndUpdate(
                    req.user.id,
                    {
                        shipping_address: payload.shipping_address,
                        location: payload.location,
                    },
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    console.error(" User not found for ID:", req.user.id);
                    return res.status(404).json({
                        status: false,
                        message: "User not found"
                    });
                }
                
            } catch (userUpdateError) {
                console.error("⚠️ Error updating user address:", userUpdateError);
                
            }
        }

    
        if (payload.user && payload.pointtype === "REDEEM") {
            try {
                let userdata = await User.findById(payload.user);
                if (userdata) {
                    userdata.referalpoints = userdata.referalpoints - Number(payload.point);
                    await userdata.save();
                   
                }
            } catch (pointsError) {
                console.error("⚠️ Error updating referral points:", pointsError);
                
            }
        }

      
    
        if (!savedOrders.length) {
            return res.status(400).json({
                status: false,
                success: false,
                message: "No orders could be created because seller information was missing on products. Please contact support.",
            });
        }

        return res.status(200).json({
            status: true,
            success: true,
            message: "Product request added successfully",
            data: {
                status: true,
                orders: savedOrders,
                totalOrders: savedOrders.length
            }
        });

    } catch (error) {
       
        
 
        if (!res.headersSent) {
            return res.status(500).json({
                status: false,
                success: false,
                message: error.message || "Internal server error",
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
},

 getTopSoldProduct: async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

   
    const cacheKey = `topSoldProducts_page${page}_limit${limit}`;
    
    
    const cachedData = cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      console.log('Returning cached top sold products');
      return res.status(200).json(cachedData.data);
    }

   // Define the base query
   const query = {
     status: "verified",
     is_verified: true,  // Only show verified products
     sold_pieces: { $gt: 0 } 
   };
   
   // For admin users, show all products regardless of verification status
   if (req.user && req.user.role === 'admin') {
     delete query.is_verified;
   }

    // Use aggregation pipeline for better performance
    const products = await Product.aggregate([
      { $match: query },
      { $sort: { sold_pieces: -1, createdAt: -1 } }, // Sort by sold pieces, then by newest
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1, slug: 1 } }] // Only get necessary category fields
        }
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          image: 1,
          images: 1,
          short_description: 1,
          price_slot: 1,
          sold_pieces: 1,
          category: 1,
          varients: 1,
          is_verified: 1,
          sponsered: 1,
          createdAt: 1
        }
      }
    ]);

    // Get total count for pagination (using separate optimized query)
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const responseData = {
      status: true,
      data: products,
      pagination: {
        totalItems: totalProducts,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    };

    // Cache the response data
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (cache.size > 100) {
      const oldEntries = Array.from(cache.entries())
        .filter(([key, value]) => (Date.now() - value.timestamp) > CACHE_TTL)
        .map(([key]) => key);
      oldEntries.forEach(key => cache.delete(key));
    }

    console.log('Returning fresh top sold products data');
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('getTopSoldProduct error:', error);
    return response.error(res, error);
  }
},


  // Returns seller's wallet balance and recent earning transactions from orders
  getSellerProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const skip = (page - 1) * limit;
      const sellerId = req.query.seller_id;

      if (!sellerId) {
        return res.status(400).json({ status: false, message: 'Seller ID is required' });
      }

      const products = await Product.aggregate([
        { 
          $match: { 
            userid: new mongoose.Types.ObjectId(sellerId) 
          } 
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
            pipeline: [{ $project: { name: 1, slug: 1 } }]
          }
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            images: 1,
            short_description: 1,
            price_slot: 1,
            sold_pieces: 1,
            category: 1,
            varients: 1,
            is_verified: 1,
            sponsered: 1,
            status: 1,
            createdAt: 1,
            userid: 1,
            stock: 1
          }
        }
      ]);

      const totalProducts = await Product.countDocuments({ userid: sellerId });
      const totalPages = Math.ceil(totalProducts / limit);

      return res.status(200).json({
        status: true,
        data: products,
        pagination: {
          totalItems: totalProducts,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      console.error('getSellerProducts error:', error);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  },

  getSellerWalletSummary: async (req, res) => {
    try {
      const sellerId = req.user.id;

      // Current seller profile for wallet balance
      const seller = await User.findById(sellerId).select('wallet firstName lastName email role');
      if (!seller) {
        return response.error(res, { message: 'Seller not found' });
      }

      // Recent earnings from orders
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [items, totals] = await Promise.all([
        ProductRequest.find({ seller_id: sellerId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .select('orderId sellerEarnings adminFee total paymentmode createdAt')
          .lean(),
        ProductRequest.aggregate([
          { $match: { seller_id: new mongoose.Types.ObjectId(sellerId) } },
          { $group: { _id: null, totalEarnings: { $sum: { $ifNull: ['$sellerEarnings', 0] } }, orders: { $sum: 1 } } },
        ]),
      ]);

      const aggregate = totals && totals.length ? totals[0] : { totalEarnings: 0, orders: 0 };

      return res.status(200).json({
        status: true,
        data: {
          wallet: seller.wallet || 0,
          totalEarnings: aggregate.totalEarnings || 0,
          totalOrders: aggregate.orders || 0,
          transactions: items,
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  // Admin wallet summary - shows commission earnings
  getAdminWalletSummary: async (req, res) => {
    try {
      // Get admin user
      const admin = await User.findOne({ role: 'admin' }).select('cashReceive firstName lastName email role');
      if (!admin) {
        return response.error(res, { message: 'Admin not found' });
      }

      // Recent commission earnings from orders
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [items, totals] = await Promise.all([
        ProductRequest.find({ adminFee: { $gt: 0 } })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .select('orderId adminFee sellerEarnings total paymentmode createdAt seller_id')
          .populate('seller_id', 'firstName lastName email')
          .lean(),
        ProductRequest.aggregate([
          { $match: { adminFee: { $gt: 0 } } },
          { $group: { 
            _id: null, 
            totalCommissions: { $sum: { $ifNull: ['$adminFee', 0] } }, 
            totalOrders: { $sum: 1 } 
          } },
        ]),
      ]);

      const aggregate = totals && totals.length ? totals[0] : { totalCommissions: 0, totalOrders: 0 };

      return res.status(200).json({
        status: true,
        data: {
          cashReceive: admin.cashReceive || 0,
          totalCommissions: aggregate.totalCommissions || 0,
          totalOrders: aggregate.totalOrders || 0,
          transactions: items,
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getrequestProduct: async (req, res) => {
    try {
      const product = await ProductRequest.find()
        .populate("user category", "-password -varients")
        .sort({ createdAt: -1 });
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  refundProduct: async (req, res) => {
    try {
      const productId = req.body.product_id;
      const { reason, refundProof } = req.body;

      const order = await ProductRequest.findById(req.params.id).populate(
        "seller_id",
        "username email"
      );

      if (!order) {
        return response.error(res, { message: "Order not found" });
      }

      if (order.status === "Refunded") {
        return response.error(res, { message: "Product already refunded" });
      }

      if (order.status !== "Delivered" || !order.deliveredAt) {
        return response.error(res, {
          message: "Return is allowed only after delivery",
        });
      }

      const deliveredTime = new Date(order.deliveredAt).getTime();
      const currentTime = Date.now();
      const refundWindow = 15 * 60 * 1000;

      if (currentTime - deliveredTime > refundWindow) {
        return response.error(res, {
          message:
            "Return window expired. Returns are only allowed within 15 minutes after delivery.",
        });
      }

      const orderedProduct = order.productDetail.find(
        (item) => item.product.toString() === productId
      );

      if (!orderedProduct) {
        return response.error(res, { message: "Product not found in order" });
      }

      const returnAmount = orderedProduct.price || 0;

      const isReturnable = orderedProduct?.isReturnable ?? true;

      if (!isReturnable) {
        // order.status = "Refund-Requested";
        orderedProduct.returnDetails.returnStatus = "Auto-Refunded";
        orderedProduct.returnDetails.isRefunded = true;
        orderedProduct.returnDetails.returnRequestDate = new Date();
        orderedProduct.returnDetails.reason = reason;
        orderedProduct.returnDetails.proofImages = refundProof;
        orderedProduct.returnDetails.refundAmount = returnAmount;

        // order.returnAmount = returnAmount;
        // order.refundby = req.user.id;
        // order.returnreason = "Auto-refunded: non-returnable item";
        // order.returnproof = refundProof || null;
        // order.returndate = new Date();
        // order.returnstatus = "Refunded";
        // order.refundedWithoutReturn = true;

        // await User.findByIdAndUpdate(
        //   order.user,
        //   { $inc: { wallet: Number(returnAmount) } },
        //   { new: true }
        // );

        // await User.findByIdAndUpdate(
        //   order.seller_id._id,
        //   { $inc: { wallet: -Number(returnAmount) } },
        //   { new: true }
        // );

        // await mailNotification.sendMail(
        //   order.user,
        //   "Refund Requested",
        //   `Your refund for a non-returnable item was processed successfully. Amount: $${returnAmount}`
        // );
        await mailNotification.returnMail({
          email: order.seller_id.email,
          returnAmount: returnAmount,
        });
      } else {
        // order.status = "Return-requested";
        orderedProduct.returnDetails.returnStatus = "Return-requested";
        orderedProduct.returnDetails.isReturned = true;
        orderedProduct.returnDetails.returnRequestDate = new Date();
        orderedProduct.returnDetails.reason = reason;
        orderedProduct.returnDetails.proofImages = refundProof;

        // order.return = true;
        // order.returnAmount = returnAmount;
        // order.returnreason = reason;
        // order.returnproof = refundProof;
        // order.returndate = new Date();
        // order.returnstatus = "Pending";
        // order.productId = productId;
      }

      await mailNotification.returnMail({
        email: order.seller_id.email,
        returnAmount: returnAmount,
      });

      console.log(order);

      await order.save();

      return response.success(res, {
        data: order,
        message: "Your refund request has been processed successfully",
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getOrderBySeller: async (req, res) => {
    try {
      let cond = {};
      const { curDate } = req.body;

      if (req.user.type === "SELLER") {
        cond = {
          seller_id: req.user.id,
          assignedEmployee: { $exists: false },
          // status: { $in: ["Pending", "Packed"] }
          status: { $in: ["Pending", "Packed"] },
        };
      }

      if (req.user.type === "ADMIN") {
        if (req.body.seller_id) {
          cond = {
            seller_id: req.body.seller_id,
          };
        }
      }

      if (curDate) {
        cond.createdAt = {
          $gte: new Date(`${curDate}T00:00:00.000Z`),
          $lt: new Date(`${curDate}T23:59:99.999Z`),
        };
      }

      // Added to handle the date request for admin
      if (req.body.curentDate) {
        const newEt = new Date(
          new Date(req.body.curentDate).setDate(
            new Date(req.body.curentDate).getDate() + 1
          )
        );
        cond.createdAt = { $gte: new Date(req.body.curentDate), $lte: newEt };
      }

      // Pagination
      let page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 10;
      let skip = (page - 1) * limit;

      const product = await ProductRequest.find(cond)
        .populate("user", "-password -varients")
        .populate("productDetail.product")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const indexedProducts = product.map((item, index) => ({
        ...(item.toObject?.() || item),
        indexNo: skip + index + 1,
      }));

      const totalBlogs = await ProductRequest.countDocuments(cond);
      const totalPages = Math.ceil(totalBlogs / limit);

      return res.status(200).json({
        status: true,
        data: indexedProducts,
        pagination: {
          totalItems: totalBlogs,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getSellerOrderByAdmin: async (req, res) => {
    try {
      let cond = {};
      const { curDate, sellerName, customerName, returnOrders } = req.body;

      if (curDate) {
        cond.createdAt = {
          $gte: new Date(`${curDate}T00:00:00.000Z`),
          $lt: new Date(`${curDate}T23:59:99.999Z`),
        };
      }

      if (req.body.curentDate) {
        const newEt = new Date(
          new Date(req.body.curentDate).setDate(
            new Date(req.body.curentDate).getDate() + 1
          )
        );
        cond.createdAt = { $gte: new Date(req.body.curentDate), $lte: newEt };
      }

      if (customerName) {
        const user = await User.findOne({
          username: new RegExp("^" + customerName.trim(), "i"), // Case-insensitive search
        });

        if (user) {
          cond["user"] = user._id;
        } else {
          return res
            .status(404)
            .json({ status: false, message: "Customer not found." }); // Handle user not found
        }
      }
      if (sellerName) {
        const seller = await User.findOne({
          username: new RegExp("^" + sellerName.trim(), "i"), // Case-insensitive search
        });

        if (seller) {
          cond["seller_id"] = seller._id;
        } else {
          return res
            .status(404)
            .json({ status: false, message: "Seller not found." }); // Handle seller not found
        }
      }

      if (req.body.returnOrders) {
        cond.return = req.body.returnOrders;
      }

      let page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 10;
      let skip = (page - 1) * limit;

      const product = await ProductRequest.find(cond)
        .populate("user", "-password -varients")
        .populate("productDetail.product")
        .populate("seller_id", "-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const indexedProducts = product.map((item, index) => ({
        ...(item.toObject?.() || item),
        indexNo: skip + index + 1,
      }));

      const totalBlogs = await ProductRequest.countDocuments(cond);
      const totalPages = Math.ceil(totalBlogs / limit);

      return res.status(200).json({
        status: true,
        data: indexedProducts,
        pagination: {
          totalItems: totalBlogs,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getSellerReturnOrderByAdmin: async (req, res) => {
    try {
      let cond = {};
      const { curDate, curentDate, sellerName, customerName } = req.body;

      if (curDate) {
        cond.createdAt = {
          $gte: new Date(`${curDate}T00:00:00.000Z`),
          $lt: new Date(`${curDate}T23:59:59.999Z`),
        };
      }

      if (req.body.seller_id) {
        cond.seller_id = req.body.seller_id;
      }

      if (curentDate) {
        const startDate = new Date(curentDate);
        const endDate = new Date(
          new Date(curentDate).setDate(startDate.getDate() + 1)
        );
        cond.createdAt = { $gte: startDate, $lt: endDate };
      }

      if (req.user.type === "SELLER") {
        cond.seller_id = req.user.id;
      }

      if (customerName) {
        const user = await User.findOne({
          username: new RegExp("^" + customerName.trim(), "i"), // Case-insensitive search
        });

        if (user) {
          cond["user"] = user._id;
        } else {
          return res
            .status(404)
            .json({ status: false, message: "Customer not found." }); // Handle user not found
        }
      }
      if (sellerName) {
        const seller = await User.findOne({
          username: new RegExp("^" + sellerName.trim(), "i"), // Case-insensitive search
        });

        if (seller) {
          cond["seller_id"] = seller._id;
        } else {
          return res
            .status(404)
            .json({ status: false, message: "Seller not found." }); // Handle seller not found
        }
      }

      cond.productDetail = {
        $elemMatch: {
          returnDetails: { $exists: true },
          $or: [
            { "returnDetails.isReturned": true },
            { "returnDetails.isRefunded": true },
          ],
        },
      };

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const orders = await ProductRequest.find(cond)
        .populate("user", "-password -varients")
        .populate("productDetail.product")
        .populate("seller_id", "-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const filteredOrders = orders
        .map((order, index) => {
          const orderObj = order.toObject?.() || order;

          const returnedItems =
            orderObj.productDetail?.filter(
              (item) => item.returnDetails?.isReturned === true
            ) || [];

          // const refundedItems =
          // orderObj.productDetail?.filter(
          //   (item) => item.returnDetails?.isRefunded === true
          // ) || [];

          // if (returnedItems.length > 0 || refundedItems.length > 0) {
          //   return {
          //     ...orderObj,
          //     indexNo: skip + index + 1,
          //     productDetail: returnedItems.concat(refundedItems),
          //   };
          // }
          if (returnedItems.length > 0) {
            return {
              ...orderObj,
              indexNo: skip + index + 1,
              productDetail: returnedItems,
            };
          }

          return null;
        })
        .filter(Boolean);

      const totalOrders = await ProductRequest.countDocuments(cond);
      const totalPages = Math.ceil(totalOrders / limit);

      return res.status(200).json({
        status: true,
        data: filteredOrders,
        pagination: {
          totalItems: totalOrders,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      console.error("Error in getSellerReturnOrderByAdmin:", error);
      return response.error(res, error);
    }
  },

getSellerProductByAdmin: async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    let query = {};

    // Add seller_id filter if provided
    if (req.query.seller_id) {
      query.userid = req.query.seller_id;
    }

    // Get total count first for pagination
    const totalProducts = await Product.countDocuments(query);
    
    let products = await Product.find(query)
      .populate("category")
      .populate("userid", "-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Apply search filter after populate
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      products = products.filter(p =>
        searchRegex.test(p.name) ||
        searchRegex.test(p.category?.name || "") ||
        searchRegex.test(p.userid?.username || "")
      );
    }

    const totalPages = Math.ceil(totalProducts / limit);

    return res.status(200).json({
      status: true,
      data: products,
      pagination: {
        totalItems: totalProducts,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error in getSellerProductByAdmin:", error);
    return res.status(500).json({
      status: false,
      message: "Server error occurred",
      error: error.message
    });
  }
},


  getAssignedOrder: async (req, res) => {
    try {
      let cond = {};
      if (req.user.type === "SELLER") {
        cond = {
          seller_id: req.user.id,
          assignedEmployee: { $exists: true },
          status: { $ne: "Delivered" },
        };
      }
      const product = await ProductRequest.find(cond)
        .populate("user", "-password")
        .populate("productDetail.product")
        .sort({ createdAt: -1 });
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  cashcollected: async (req, res) => {
    try {
      const product = await ProductRequest.findById(req.body.id);

      const driver = await User.findById(product.driver_id);

      if (driver?.wallet) {
        driver.wallet = driver.wallet + Number(product.total);
      } else {
        driver.wallet = Number(product.total);
      }
      driver.save();

      product.cashcollected = "Yes";

      product.save();

      await User.findByIdAndUpdate(
        product.seller_id,
        { $inc: { wallet: Number(product.total) } },
        { new: true, upsert: true }
      );

      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  changeorderstatus: async (req, res) => {
    try {
      const product = await ProductRequest.findById(req.body.id);
      product.status = req.body.status;
      if (req.body.status === "Driverassigned") {
        let driverlist = await User.find({
          type: "Driver",
          location: {
            $near: {
              $maxDistance: 1609.34 * 10,
              $geometry: product.location,
            },
          },
        });
        {
          driverlist.length > 0 &&
            (await notify(
              driverlist,
              "New Order receive",
              "You New Order receive for delivery"
            ));
        }
      }
      if (req.body.status === "Delivered") {
        product.onthewaytodelivery = false;
        product.deliveredAt = new Date();
        await notify(
          product.user,
          "Order delivered",
          "You order delivered successfully"
        );
      }
      if (req.body.status === "Collected") {
        await notify(
          product.user,
          "Order collected",
          "Order collected by driver"
        );
      }

      product.save();
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  onthewaytodelivery: async (req, res) => {
    try {
      const product = await ProductRequest.findById(req.params.id);
      product.onthewaytodelivery = true;

      product.save();
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  productSearch: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      let cond = {
        $or: [
          { name: { $regex: req.query.key, $options: "i" } },
          { categoryName: { $regex: req.query.key, $options: "i" } },
        ],
      };
      const product = await Product.find(cond)
        .sort({ createdAt: -1 })
        // .select("name offer price userid varients")
        .limit(limit * 1)
        .skip((page - 1) * limit);
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  updaterequestProduct: async (req, res) => {
    try {
      const product = await ProductRequest.findByIdAndUpdate(
        req.params.id,
        req.body,
        { upsert: true, new: true }
      );
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getrequestProductbyid: async (req, res) => {
    try {
      const product = await ProductRequest.findById(req.params.id)
        .populate("user driver_id seller_id", "-password")
        .populate("productDetail.product");
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  nearbyorderfordriver: async (req, res) => {
    try {
      let orders = await ProductRequest.find({
        status: "Driverassigned",
        driver_id: { $exists: false },
        location: {
          $near: {
            $maxDistance: 1609.34 * 10,
            $geometry: {
              type: "Point",
              coordinates: req.body.location,
            },
          },
        },
      })
        .sort({ createdAt: -1 })
        .populate("user", "-password");
      return response.success(res, orders);
    } catch (err) {
      return response.error(res, err);
    }
  },
  acceptedorderfordriver: async (req, res) => {
    try {
      const product = await ProductRequest.find({
        driver_id: req.user.id,
        status: { $ne: "Delivered" },
      })
        .sort({ createdAt: -1 })
        .populate("user", "-password");
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  acceptorderdriver: async (req, res) => {
    try {
      const product = await ProductRequest.findById(req.params.id);
      if (product.driver) {
        return response.badReq(res, { message: "Order already accepted" });
      }
      product.driver_id = req.user.id;
      // product.status='Driveraccepted'
      product.save();
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  orderhistoryfordriver: async (req, res) => {
    try {
      const product = await ProductRequest.find({
        driver_id: req.user.id,
        status: "Delivered",
      })
        .sort({ createdAt: -1 })
        .populate("user", "-password");
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },
  orderhistoryforvendor: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const product = await ProductRequest.find({
        seller_id: req.user.id,
        status: "Delivered",
      })
        .sort({ createdAt: -1 })
        .populate("user", "-password")
        .limit(limit * 1)
        .skip((page - 1) * limit);
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  // getrequestProductbyuser: async (req, res) => {
  //   try {
  //     const { page = 1, limit = 20 } = req.query;
  //     const product = await ProductRequest.find({ user: req.user.id })
  //       .populate("productDetail.product", "-varients")
  //       .limit(limit * 1)
  //       .skip((page - 1) * limit)
  //       .sort({ createdAt: -1 });
  //     // const product = await ProductRequest.aggregate([
  //     //     {
  //     //         $match: { user: new mongoose.Types.ObjectId(req.user.id) }
  //     //     },
  //     //     {
  //     //         $unwind: {
  //     //             path: '$productDetail',
  //     //             preserveNullAndEmptyArrays: true
  //     //         }
  //     //     },
  //     //     {
  //     //         $lookup: {
  //     //             from: 'products',
  //     //             localField: 'productDetail.product',
  //     //             foreignField: '_id',
  //     //             as: 'productDetail.product',
  //     //             pipeline: [

  //     //                 {
  //     //                     $project: {
  //     //                         name: 1
  //     //                     }
  //     //                 },

  //     //             ]
  //     //         }
  //     //     },
  //     //     {
  //     //         $unwind: {
  //     //             path: '$productDetail.product',
  //     //             preserveNullAndEmptyArrays: true
  //     //         }
  //     //     },

  //     // ])

  //     return response.success(res, product);
  //   } catch (error) {
  //     return response.error(res, error);
  //   }
  // },
  getrequestProductbyuser: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user.id;

      // Get orders for the user
      const orders = await ProductRequest.find({ user: userId })
        .populate({
          path: "productDetail.product",
          select: "name price image"
        })
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean();

      // Get all product IDs from orders
      const allProductIds = [];
      orders.forEach(order => {
        if (order.productDetail && Array.isArray(order.productDetail)) {
          order.productDetail.forEach(item => {
            const productId = item.product?._id || item.product;
            if (productId) {
              allProductIds.push(productId);
            }
          });
        }
      });

      // Get reviews for the products
      const reviews = await Review.find({
        product: { $in: allProductIds },
        posted_by: userId
      }).lean();

      // Get review stats for the products
      const allReviews = await Review.aggregate([
        {
          $match: {
            product: { $in: allProductIds.map(id => new mongoose.Types.ObjectId(id)) }
          }
        },
        {
          $group: {
            _id: '$product',
            totalRatings: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        }
      ]);

      // Create a map of user reviews
      const userReviewMap = {};
      reviews.forEach(review => {
        userReviewMap[review.product.toString()] = {
          rating: review.rating,
          description: review.description,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          _id: review._id
        };
      });

      // Create a map of review stats
      const reviewStatsMap = {};
      allReviews.forEach(stat => {
        reviewStatsMap[stat._id.toString()] = {
          totalRatings: stat.totalRatings,
          averageRating: stat.averageRating
        };
      });

      // Add review status to each product in each order
      const ordersWithReviews = orders.map(order => {
        if (order.productDetail && Array.isArray(order.productDetail)) {
          order.productDetail = order.productDetail.map(item => {
            const productId = item.product?._id?.toString() || item.product?.toString();
            const hasUserReview = productId && userReviewMap[productId];
            const stats = reviewStatsMap[productId] || { totalRatings: 0, averageRating: 0 };

            return {
              ...item,
              isRated: !!hasUserReview, // True only if current user has reviewed
              review: hasUserReview || null,
              rating: hasUserReview ? userReviewMap[productId].rating : 0,
              // Include review stats for the product
              reviewStats: {
                totalRatings: stats.totalRatings,
                averageRating: stats.averageRating
              }
            };
          });
        }
        return order;
      });

      return response.success(res, ordersWithReviews);
    } catch (error) {
      console.error('Error in getrequestProductbyuser:', error);
      return response.error(res, error);
    }
  },
  uploadProducts: async (req, res) => {
    try {
      const products = req.body;

      const insertedProducts = await Product.insertMany(products);
      return res.status(201).json({
        status: true,
        message: "Products uploaded successfully",
        data: insertedProducts,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Server Error", error: error.message });
    }
  },

  suspendProduct: async (req, res) => {
    try {
      console.log('=== suspendProduct called ===');
      console.log('Product ID to suspend:', req.params.id);
      console.log('User making request:', req.user ? req.user.role : 'No user in request');

      const { id } = req.params;
      
      // Find and update in one operation
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { 
          $set: { 
            status: "suspended",
            is_verified: false  // Ensure is_verified is set to false when suspending
          } 
        },
        { new: true }
      );

      if (!updatedProduct) {
        console.error('Product not found with ID:', id);
        return res.status(404).json({ message: "Product not found" });
      }

      console.log('Successfully suspended product:', {
        _id: updatedProduct._id,
        name: updatedProduct.name,
        status: updatedProduct.status,
        is_verified: updatedProduct.is_verified
      });

      // Clear relevant caches
      const cacheKeys = Array.from(cache.keys());
      console.log(`Clearing cache. Total cache entries: ${cacheKeys.length}`);
      
      const clearedCaches = [];
      cacheKeys.forEach(key => {
        if (key.startsWith('topSoldProducts_') || key.startsWith('products_')) {
          cache.delete(key);
          clearedCaches.push(key);
        }
      });
      
      console.log(`Cleared ${clearedCaches.length} cache entries`);
      console.log('=== suspendProduct completed ===\n');

      res.status(200).json({
        success: true,
        message: 'Product suspended successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Error in suspendProduct:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  getdriveramount: async (req, res) => {
    try {
      // Pagination
      let page = parseInt(req.query.page) || 1;
      let limit = parseInt(req.query.limit) || 10;
      let skip = (page - 1) * limit;

      const product = await User.find({ wallet: { $gt: 0 }, type: "DRIVER" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const indexedProducts = product.map((item, index) => ({
        ...(item.toObject?.() || item),
        indexNo: skip + index + 1,
      }));

      const totalProducts = await User.countDocuments({
        wallet: { $gt: 0 },
        type: "DRIVER",
      });

      const totalPages = Math.ceil(totalProducts / limit);

      // return response.success(res, product);
      return res.status(200).json({
        status: true,
        data: indexedProducts,
        pagination: {
          totalItems: totalProducts,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getdriverpendingamount: async (req, res) => {
    try {
      const product = await ProductRequest.find({
        driver_id: req.params.id,
        cashcollected: "Yes",
        amountreceivedbyadmin: "No",
      }).populate("productDetail.product", "-varients");
      return response.success(res, product);
    } catch (error) {
      return response.error(res, error);
    }
  },

  collectcash: async (req, res) => {
    try {
      const product = await ProductRequest.updateMany(
        {
          driver_id: req.params.id,
          cashcollected: "Yes",
          amountreceivedbyadmin: "No",
        },
        { $set: { amountreceivedbyadmin: "Yes" } }
      );

      const driverdata = await User.findById(req.params.id);
      if (driverdata) {
        driverdata.wallet = 0;
      }
      await driverdata.save();
      return response.success(res, { message: "Status update succesfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  assignOrderToEmployee: async (req, res) => {
    try {
      const { orderId, assignedEmployee } = req.body;
      const order = await ProductRequest.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.assignedEmployee = assignedEmployee;
      await order.save();
      return res.status(200).json({ message: "Order assigned successfully" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
  getOrderByEmployee: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const product = await ProductRequest.find({
        assignedEmployee: req.user.id,
        status: { $in: ["Pending", "Packed"] },
      })
        .populate("user", "-password -varients")
        .populate("productDetail.product")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      return res.status(200).json({
        status: true,
        data: product,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getOrderHistoryByEmployee: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const product = await ProductRequest.find({
        assignedEmployee: req.user.id,
        status: { $nin: ["Pending", "Packed"] },
      })
        .populate("user", "-password -varients")
        .populate("productDetail.product")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      return res.status(200).json({
        status: true,
        data: product,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },

  reminderSellerForReturn: async (req, res) => {
    try {
      const { orderId, sellerId } = req.body;
      const seller = await User.findById(sellerId).select("email");

      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      await mailNotification.returnReminderMail({
        email: seller.email,
        orderId: orderId,
      });
      
      return response.success(res, {
        message: "Reminder email sent to seller successfully",
      });
    } catch (error) {
      console.error("Error in reminderSellerForReturn:", error);
      return response.error(res, error);
    }
  },
  updateProductStatus: async (req, res) => {
    try {
      console.log('=== updateProductStatus called ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User making request:', req.user ? req.user.role : 'No user in request');

      const { id, status } = req.body;

      if (!id || !status || !['verified', 'suspended', 'rejected', 'pending'].includes(status)) {
        const errorMsg = `Invalid request: ${!id ? 'Missing product ID' : 'Invalid status'}`;
        console.error(errorMsg);
        return response.error(res, { 
          message: 'Product ID and valid status (verified/suspended/rejected/pending) are required' 
        }, 400);
      }

      // Log current state before update
      const currentProduct = await Product.findById(id);
      console.log('Current product state:', {
        _id: currentProduct?._id,
        name: currentProduct?.name,
        current_status: currentProduct?.status,
        current_is_verified: currentProduct?.is_verified
      });

      // Prepare update object
      const updateData = { status };
      
      // Update is_verified based on status
      if (status === 'verified') {
        updateData.is_verified = true;
        console.log(`Updating product ${id} to verified status`);
      } else if (['suspended', 'rejected', 'pending'].includes(status)) {
        updateData.is_verified = false;
        console.log(`Updating product ${id} to ${status} status`);
      }

      console.log('Update data:', updateData);

      const product = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!product) {
        console.error(`Product not found with ID: ${id}`);
        return response.error(res, { message: 'Product not found' }, 404);
      }

      console.log('Successfully updated product:', {
        _id: product._id,
        name: product.name,
        new_status: product.status,
        new_is_verified: product.is_verified,
        updatedAt: product.updatedAt
      });

      // Clear relevant caches
      const cacheKeys = Array.from(cache.keys());
      console.log(`Clearing cache. Total cache entries: ${cacheKeys.length}`);
      
      const clearedCaches = [];
      cacheKeys.forEach(key => {
        if (key.startsWith('topSoldProducts_') || key.startsWith('products_')) {
          cache.delete(key);
          clearedCaches.push(key);
        }
      });
      
      console.log(`Cleared ${clearedCaches.length} cache entries:`, clearedCaches);
      console.log('=== updateProductStatus completed ===\n');

      // Clear cache for product lists
      cache.clear();

      return response.success(res, { 
        message: `Product ${status} successfully`,
        product 
      });
    } catch (error) {
      console.error('Error updating product status:', error);
      return response.error(res, error);
    }
  },

  getProductBySale: async (req, res) => {
    try {
      const { saleId } = req.params;
      
      const products = await Product.find({
        'sale.sale_id': saleId,
        'sale.is_active': true
      });

      return response.success(res, products);
    } catch (error) {
      console.error('Error in getProductBySale:', error);
      return response.error(res, error);
    }
  },

uploadImages: async (req, res) => {
  try {
    console.log('=== Upload Images Request ===');
    console.log('Files received:', req.files?.length || 0);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (!req.files || req.files.length === 0) {
      console.log('ERROR: No files in request');
      console.log('req.body:', req.body);
      return response.error(res, { message: 'No images uploaded' }, 400);
    }
    
    console.log('Processing files...');
    const imageUrls = req.files.map((file, index) => {
      console.log(`File ${index + 1}:`, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      });
      return file.path;
    });
    
    console.log('Upload successful. URLs:', imageUrls);
    
    return response.success(res, { 
      message: 'Images uploaded successfully',
      images: imageUrls 
    });
  } catch (error) {
    console.error('=== Upload Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return response.error(res, { 
      message: 'Something went wrong!',
      error: error.message 
    });
  }
}

};
