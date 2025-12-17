const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "gif", "pdf", "webp", "avif", "svg", "bmp"],
    public_id: (req, file) => {
      let filename = file.originalname.replaceAll(" ", "");
      if (file.originalname === "blob") {
        const type = file.mimetype.split("/")[1];
        filename = `${file.originalname}.${type}`;
      }
      // Remove file extension from filename for Cloudinary
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      return `${new Date().getTime()}-${nameWithoutExt}`;
    },
  },
});

module.exports = {
  upload: multer({
    storage: storage,
  }),

  updateImageExtension: async (publicId, newExtension) => {
    try {
      // Cloudinary doesn't need extension updates like S3
      // The format is handled automatically
      // If you need to convert format, you can use transformation
      const result = await cloudinary.uploader.explicit(publicId, {
        type: "upload",
        format: newExtension,
      });
      console.log(result);
      console.log(`Image format updated: ${publicId}`);
      return result;
    } catch (err) {
      console.error("Error updating image format:", err);
      throw err;
    }
  },

  // Helper function to delete files from Cloudinary
  deleteFile: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`File deleted: ${publicId}`);
      return result;
    } catch (err) {
      console.error("Error deleting file:", err);
      throw err;
    }
  },
};
