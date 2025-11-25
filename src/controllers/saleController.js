const mongoose = require("mongoose");
const FlashSale = require('../models/Sale');

module.exports = {

  createFlashSale: async (req, res) => {
    try {
      const payload = req?.body || {};

      if (!payload.SellerId) {
        return res.status(400).json({
          success: false,
          message: "Seller ID is required",
        });
      }

      const existingSale = await FlashSale.findOne({
        SellerId: payload.SellerId,
      });

      if (existingSale) {
        return res.status(400).json({
          success: false,
          message:
            "A flash sale already exists for this seller. Please end it before creating a new one.",
        });
      }

      const sale = new FlashSale(payload);
      const flashSale = await sale.save();

      return res.status(200).json({
        success: true,
        data: flashSale,
        message: "Flash Sale added successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error,
      });
    }
  },

 getFlashSale: async (req, res) => {
  try {
    const SellerId = req.query.SellerId;
    console.log(SellerId);
    if (!SellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required",
      });
    }

   const flashSales = await FlashSale.find({ SellerId }).populate({
  path: "products",
  populate: {
    path: "category",
    select: "name" 
  }
});

    return res.status(200).json({
      success: true,
      data: flashSales,
      message: "Flash sales retrieved successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
},
getFlashSaleBySlug: async (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log("Received slug:", slug); 
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }
    
    const allFlashSales = await FlashSale.find({}, 'slug');
    console.log("Available slugs:", allFlashSales.map(sale => sale.slug)); // Debug log
    
    const flashSale = await FlashSale.findOne({ slug }).populate("products");
    
    console.log("Found flash sale:", flashSale ? "Yes" : "No"); // Debug log
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        message: "Flash sale not found",
      });
    }
    
    return res.status(200).json({
      success: true,
      data: flashSale,
      message: "Flash sale retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getFlashSaleBySlug:", error); // Debug log
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
},

  deleteFlashSaleProduct: async (req, res) => {
    try {
      const { _id, SellerId } = req.body;

      if (!_id || !SellerId) {
        return res.status(400).json({
          success: false,
          message: "Product ID and Seller ID are required",
        });
      }

      const updatedFlashSale = await FlashSale.findOneAndUpdate(
        { SellerId },
        { $pull: { products: _id } },
        { new: true, runValidators: true }
      );

      if (!updatedFlashSale) {
        return res.status(404).json({
          success: false,
          message: "Flash sale not found for this seller.",
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedFlashSale,
        message: "Product deleted from Flash Sale successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error,
      });
    }
  },

  deleteFlashSale: async (req, res) => {
    try {
      const { SellerId } = req.query;

      if (!SellerId) {
        return res.status(400).json({
          success: false,
          message: "Seller ID is required",
        });
      }

      const result = await FlashSale.deleteMany({ SellerId });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "No flash sales found for this seller to delete.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Flash sales deleted successfully for this seller",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error,
      });
    }
  },

  endExpiredFlashSales: async () => {
    try {
      const now = new Date();
      await FlashSale.deleteMany({ endDateTime: { $lt: now } });
    } catch (error) {
      console.error("Error deleting expired flash sales:", error);
    }
  },

  getOneFlashSalePerSeller: async (req, res) => {
    try {
      const flashSales = await FlashSale.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$SellerId",
            flashSale: { $first: "$$ROOT" }
          }
        }
      ]);

      const populatedFlashSales = await FlashSale.populate(
        flashSales.map(f => f.flashSale),
        { path: "products" }
      );

      return res.status(200).json({
        success: true,
        data: populatedFlashSales,
        message: "Flash sales retrieved successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error,
      });
    }
  },

  getSaleById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const sale = await FlashSale.findById(id).populate('products');
      
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      return res.status(200).json({
        success: true,
        status: true,
        data: sale,
        message: "Sale retrieved successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error,
      });
    }
  },

  updateSale: async (req, res) => {
    try {
      const { saleId, ...updateData } = req.body;
      
      if (!saleId) {
        return res.status(400).json({
          success: false,
          message: "Sale ID is required",
        });
      }

      const updatedSale = await FlashSale.findByIdAndUpdate(
        saleId,
        updateData,
        { new: true, runValidators: true }
      ).populate('products');

      if (!updatedSale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      return res.status(200).json({
        success: true,
        status: true,
        data: updatedSale,
        message: "Sale updated successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error,
      });
    }
  },

};
// 