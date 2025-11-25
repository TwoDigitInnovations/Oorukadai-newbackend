const cloudinary = require('../config/cloudinary')

const uploadToCloudinary = async (file, folder = 'products') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    throw new Error('Image upload failed');
  }
};

const uploadMultipleToCloudinary = async (files, folder = 'products') => {
  try {
    const uploadPromises = files.map(file => 
      cloudinary.uploader.upload(file.path, {
        folder: folder,
        resource_type: 'auto',
      })
    );
    const results = await Promise.all(uploadPromises);
    return results.map(result => result.secure_url);
  } catch (error) {
    throw new Error('Multiple images upload failed');
  }
};

module.exports = { uploadToCloudinary, uploadMultipleToCloudinary };