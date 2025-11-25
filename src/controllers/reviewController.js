const Product = require("@models/Product");
const Review = require("@models/Review");
const mongoose = require("mongoose"); 


const updateProductRating = async (productId) => {
  try {
    const ratingStats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const avgRating = ratingStats[0]?.averageRating || 0;
    const totalReviews = ratingStats[0]?.totalReviews || 0;

    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avgRating * 10) / 10, 
      totalReviews: totalReviews
    });

  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

module.exports = {
  addProductReview: async (req, res) => {
    try {
      const { product, rating, review } = req.body;
      const userId = req.user._id;

      if (!product || !rating) {
        return res.status(400).json({
          status: false,
          message: "Product and rating are required"
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          status: false,
          message: "Rating must be between 1 and 5"
        });
      }

      const productExists = await Product.findById(product);
      if (!productExists) {
        return res.status(404).json({
          status: false,
          message: "Product not found"
        });
      }

      const existingReview = await Review.findOne({
        product: product,
        posted_by: userId
      });

      let reviewData;

      if (existingReview) {
        existingReview.rating = rating;
        existingReview.description = review || existingReview.description;
        reviewData = await existingReview.save();
      } else {
        reviewData = new Review({
          product: product,
          posted_by: userId,
          rating: rating,
          description: review || ""
        });
        await reviewData.save();
      }

      await updateProductRating(product);

      return res.status(200).json({
        status: true,
        message: existingReview ? "Review updated successfully" : "Review added successfully",
        data: reviewData
      });

    } catch (error) {
      console.error("Error in addProductReview:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  getProductReviews: async (req, res) => {
    try {
    const productId = req.params.productId || req.query.product;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid product ID"
        });
      }

      const reviews = await Review.find({ product: productId })
         .populate('posted_by', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalReviews = await Review.countDocuments({ product: productId });

      const ratingDistribution = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]);

      const avgRating = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 }
          }
        }
      ]);

      return res.status(200).json({
        status: true,
        data: {
          reviews,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalReviews / limit),
            totalReviews,
            hasNext: page < Math.ceil(totalReviews / limit),
            hasPrev: page > 1
          },
          ratingDistribution,
          averageRating: avgRating[0]?.averageRating || 0,
          totalReviews: avgRating[0]?.totalReviews || 0
        }
      });

    } catch (error) {
      console.error("Error in getProductReviews:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  deleteReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid review ID"
        });
      }

      const review = await Review.findById(reviewId);
      
      if (!review) {
        return res.status(404).json({
          status: false,
          message: "Review not found"
        });
      }

      if (review.posted_by.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          status: false,
          message: "You can only delete your own reviews"
        });
      }

      const productId = review.product;
      await Review.findByIdAndDelete(reviewId);

      await updateProductRating(productId);

      return res.status(200).json({
        status: true,
        message: "Review deleted successfully"
      });

    } catch (error) {
      console.error("Error in deleteReview:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  getUserReviews: async (req, res) => {
    try {
      const userId = req.user._id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const reviews = await Review.find({ posted_by: userId })
        .populate('product', 'name image slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalReviews = await Review.countDocuments({ posted_by: userId });

      return res.status(200).json({
        status: true,
        data: {
          reviews,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalReviews / limit),
            totalReviews,
            hasNext: page < Math.ceil(totalReviews / limit),
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error("Error in getUserReviews:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },
getAllReviews: async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; 
    const skip = (page - 1) * limit;
    const dateFilter = req.query.date; 
    let matchStage = {};
    if (dateFilter) {
      const startDate = new Date(dateFilter);
      const endDate = new Date(dateFilter);
      endDate.setDate(endDate.getDate() + 1); 
      
      matchStage.createdAt = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const pipeline = [
     
      { $match: matchStage },
      
   
      { $sort: { createdAt: -1 } },
  
      {
        $lookup: {
          from: 'users', 
          localField: 'posted_by',
          foreignField: '_id',
          as: 'posted_by',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                email: 1
              }
            }
          ]
        }
      },
      
    
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
                slug: 1
              }
            }
          ]
        }
      },
      
    
      {
        $unwind: {
          path: '$posted_by',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      
     
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          count: [
            { $count: "total" }
          ]
        }
      }
    ];

    
    const result = await Review.aggregate(pipeline);
    
    const reviews = result[0].data || [];
    const totalReviews = result[0].count[0]?.total || 0;
    const totalPages = Math.ceil(totalReviews / limit);

    return res.status(200).json({
      status: true,
      message: "All reviews fetched successfully",
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        }
      }
    });

  } catch (error) {
    console.error("Error in getAllReviews:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
}

};