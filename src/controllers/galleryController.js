const Gallery = require('../models/Gallery');

// Get all gallery items
exports.getGallery = async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type, isActive: true } : { isActive: true };
    
    const gallery = await Gallery.find(query).sort({ order: 1, createdAt: -1 });
    
    return res.status(200).json({
      status: true,
      message: 'Gallery fetched successfully',
      data: gallery
    });
  } catch (err) {
    console.error('Error fetching gallery:', err);
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
};

// Get single gallery item
exports.getGalleryById = async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) {
      return res.status(404).json({
        status: false,
        message: 'Gallery item not found'
      });
    }
    return res.status(200).json({
      status: true,
      message: 'Gallery item fetched successfully',
      data: gallery
    });
  } catch (err) {
    console.error('Error fetching gallery item:', err);
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
};

// Create gallery item
exports.createGallery = async (req, res) => {
  try {
    const { type, title, subtitle, buttonText, image, link, order } = req.body;

    if (!type || !image) {
      return res.status(400).json({
        status: false,
        message: 'Type and image are required'
      });
    }

    const gallery = new Gallery({
      type,
      title: title || '',
      subtitle: subtitle || '',
      buttonText: buttonText || 'Shop Now',
      image,
      link: link || '',
      order: order || 0,
      isActive: true
    });

    await gallery.save();
    return res.status(201).json({
      status: true,
      message: 'Gallery item created successfully',
      data: gallery
    });
  } catch (err) {
    console.error('Error creating gallery:', err);
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
};

// Update gallery item
exports.updateGallery = async (req, res) => {
  try {
    const { type, title, subtitle, buttonText, image, link, order, isActive } = req.body;

    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) {
      return res.status(404).json({
        status: false,
        message: 'Gallery item not found'
      });
    }

    if (type) gallery.type = type;
    if (title) gallery.title = title;
    if (subtitle !== undefined) gallery.subtitle = subtitle;
    if (buttonText !== undefined) gallery.buttonText = buttonText;
    if (image) gallery.image = image;
    if (link !== undefined) gallery.link = link;
    if (order !== undefined) gallery.order = order;
    if (isActive !== undefined) gallery.isActive = isActive;

    await gallery.save();
    return res.status(200).json({
      status: true,
      message: 'Gallery item updated successfully',
      data: gallery
    });
  } catch (err) {
    console.error('Error updating gallery:', err);
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
};

// Delete gallery item
exports.deleteGallery = async (req, res) => {
  try {
    const gallery = await Gallery.findByIdAndDelete(req.params.id);
    if (!gallery) {
      return res.status(404).json({
        status: false,
        message: 'Gallery item not found'
      });
    }
    return res.status(200).json({
      status: true,
      message: 'Gallery item deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting gallery:', err);
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
};
