const Blog = require("@models/Blog");
const response = require("../responses");
const mailNotification = require("../services/mailNotification");

module.exports = {
  getBloggCategory: async (req, res) => {
    return response.success(res, [
      {
        id: 0,
        label: "All Blogs",
      },
      {
        id: 1,
        label: "Cleaning Checklists",
      },
      {
        id: 2,
        label: "Cleaning Tips",
      },
      {
        id: 3,
        label: "Decluttering",
      },
      {
        id: 4,
        label: "Eco living",
      },
    ]);
  },

  createBlog: async (req, res) => {
    try {
      const payload = req?.body || {};
      payload.posted_by = req.user.id;
      let blog = new Blog(payload);
      const blg = await blog.save();
      return response.success(res, blg);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBlog: async (req, res) => {
    try {
      let blog = await Blog.find().populate("posted_by", "username  email");
      return response.success(res, blog);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBlogById: async (req, res) => {
    try {
      let blog = await Blog.findById(req?.body?.id).populate(
        "posted_by",
        "username  email"
      );
      return response.success(res, blog);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBlogByCategory: async (req, res) => {
    try {
      let cond = {
        website: req?.body?.website || 'ADN'
      };
      if (req?.body?.cat_id !== 0) {
        cond.category = req?.body?.cat_id
      }
      let blog = await Blog.find(cond).populate(
        "posted_by",
        "username  email"
      );

      return response.success(res, blog);
    } catch (error) {
      return response.error(res, error);
    }
  },

  updateBlog: async (req, res) => {
    try {
      const payload = req?.body || {};
      let blog = await Blog.findByIdAndUpdate(payload?.id, payload, {
        new: true,
        upsert: true,
      });
      return response.success(res, blog);
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteBlog: async (req, res) => {
    try {
      let blog = await Blog.findByIdAndDelete(req?.body?._id);
      return response.success(res, { meaasge: "Deleted successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  checkEmailNotiFication: async (req, res) => {
    try {
      console.log(req.params.email);
      await mailNotification.bookMail({ user: { email: req.params.email } });
      return response.success(res, { meaasge: "Sent successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },
};
