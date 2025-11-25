const About = require("@models/About");
const response = require("../responses");
const { cloudinary } = require("@services/fileUpload");

// Get About Page Data
exports.getAboutPage = async (req, res) => {
  try {
    let aboutData = await About.findOne({ isActive: true });
    
    // If no data exists, create default data
    if (!aboutData) {
      aboutData = new About({
        heroTitle: 'Our Story',
        heroDescription1: 'Welcome to our store, where quality meets style. We are dedicated to providing the best products with exceptional customer service.',
        heroDescription2: 'Our mission is to make shopping easy, enjoyable, and accessible to everyone, everywhere.',
        heroImage: '/img4.png',
        statistics: [
          { title: 'Sellers Active', value: '10.5k', icon: 'chart' },
          { title: 'Monthly Product Sale', value: '33k', icon: 'sale' },
          { title: 'Customer Active', value: '45.5k', icon: 'users' },
          { title: 'Annual Gross Sale', value: '25k', icon: 'gross' }
        ],
        teamMembers: [
          { name: 'Tom Cruise', position: 'Founder & Chairman', image: '/img.png' },
          { name: 'Emma Watson', position: 'Managing Director', image: '/img2.png' },
          { name: 'Will Smith', position: 'Product Designer', image: '/img3.png' }
        ],
        services: [
          { title: 'Free and Fast Delivery', description: 'Free delivery for all orders over $140', icon: 'delivery' },
          { title: '24/7 Customer Service', description: 'Friendly 24/7 customer support', icon: 'support' },
          { title: 'Money Back Guarantee', description: 'We return money within 30 days', icon: 'guarantee' }
        ]
      });
      await aboutData.save();
    }

    return response.success(res, aboutData);
  } catch (error) {
    console.error('Error in getAboutPage:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Create or Update About Page
exports.updateAboutPage = async (req, res) => {
  try {
    const {
      heroTitle,
      heroDescription1,
      heroDescription2,
      heroImage,
      statistics,
      teamMembers,
      services
    } = req.body;

    let aboutData = await About.findOne();

    if (aboutData) {
      // Update existing data
      aboutData.heroTitle = heroTitle || aboutData.heroTitle;
      aboutData.heroDescription1 = heroDescription1 || aboutData.heroDescription1;
      aboutData.heroDescription2 = heroDescription2 || aboutData.heroDescription2;
      aboutData.heroImage = heroImage || aboutData.heroImage;
      
      if (statistics && statistics.length > 0) {
        aboutData.statistics = statistics;
      }
      
      if (teamMembers && teamMembers.length > 0) {
        aboutData.teamMembers = teamMembers;
      }
      
      if (services && services.length > 0) {
        aboutData.services = services;
      }

      await aboutData.save();
      return response.success(res, aboutData);
    } else {
      // Create new data
      const newAboutData = new About({
        heroTitle,
        heroDescription1,
        heroDescription2,
        heroImage,
        statistics,
        teamMembers,
        services
      });

      await newAboutData.save();
      return res.status(201).json({ status: true, data: newAboutData });
    }
  } catch (error) {
    console.error('Error in updateAboutPage:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Update Hero Section Only
exports.updateHeroSection = async (req, res) => {
  try {
    const { heroTitle, heroDescription1, heroDescription2, heroImage } = req.body;

    let aboutData = await About.findOne();

    if (!aboutData) {
      return response.error(res, 'About page not found. Please create it first.', 404);
    }

    aboutData.heroTitle = heroTitle || aboutData.heroTitle;
    aboutData.heroDescription1 = heroDescription1 || aboutData.heroDescription1;
    aboutData.heroDescription2 = heroDescription2 || aboutData.heroDescription2;
    aboutData.heroImage = heroImage || aboutData.heroImage;

    await aboutData.save();
    return response.success(res, aboutData);
  } catch (error) {
    console.error('Error in updateHeroSection:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Update Statistics Section
exports.updateStatistics = async (req, res) => {
  try {
    const { statistics } = req.body;

    if (!statistics || !Array.isArray(statistics)) {
      return response.error(res, 'Statistics array is required', 400);
    }

    let aboutData = await About.findOne();

    if (!aboutData) {
      return response.error(res, 'About page not found. Please create it first.', 404);
    }

    aboutData.statistics = statistics;
    await aboutData.save();

    return response.success(res, aboutData);
  } catch (error) {
    console.error('Error in updateStatistics:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Update Team Members Section
exports.updateTeamMembers = async (req, res) => {
  try {
    const { teamMembers } = req.body;

    if (!teamMembers || !Array.isArray(teamMembers)) {
      return response.error(res, 'Team members array is required', 400);
    }

    let aboutData = await About.findOne();

    if (!aboutData) {
      return response.error(res, 'About page not found. Please create it first.', 404);
    }

    aboutData.teamMembers = teamMembers;
    await aboutData.save();

    return response.success(res, aboutData);
  } catch (error) {
    console.error('Error in updateTeamMembers:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Update Services Section
exports.updateServices = async (req, res) => {
  try {
    const { services } = req.body;

    if (!services || !Array.isArray(services)) {
      return response.error(res, 'Services array is required', 400);
    }

    let aboutData = await About.findOne();

    if (!aboutData) {
      return response.error(res, 'About page not found. Please create it first.', 404);
    }

    aboutData.services = services;
    await aboutData.save();

    return response.success(res, aboutData);
  } catch (error) {
    console.error('Error in updateServices:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Delete About Page (soft delete)
exports.deleteAboutPage = async (req, res) => {
  try {
    const aboutData = await About.findOne();

    if (!aboutData) {
      return response.error(res, 'About page not found', 404);
    }

    aboutData.isActive = false;
    await aboutData.save();

    return response.success(res, aboutData);
  } catch (error) {
    console.error('Error in deleteAboutPage:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Upload Hero Image
exports.uploadHeroImage = async (req, res) => {
  try {
    if (!req.file) {
      return response.error(res, 'No image file provided', 400);
    }

    const imageUrl = req.file.path; // Cloudinary URL

    let aboutData = await About.findOne();
    if (!aboutData) {
      return response.error(res, 'About page not found. Please create it first.', 404);
    }

    aboutData.heroImage = imageUrl;
    await aboutData.save();

    return response.success(res, { imageUrl, aboutData });
  } catch (error) {
    console.error('Error in uploadHeroImage:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

// Upload Team Member Image
exports.uploadTeamImage = async (req, res) => {
  try {
    if (!req.file) {
      return response.error(res, 'No image file provided', 400);
    }

    const { memberIndex } = req.body;
    if (memberIndex === undefined) {
      return response.error(res, 'Member index is required', 400);
    }

    const imageUrl = req.file.path; // Cloudinary URL

    let aboutData = await About.findOne();
    if (!aboutData) {
      return response.error(res, 'About page not found. Please create it first.', 404);
    }

    if (!aboutData.teamMembers[memberIndex]) {
      return response.error(res, 'Team member not found at this index', 404);
    }

    aboutData.teamMembers[memberIndex].image = imageUrl;
    await aboutData.save();

    return response.success(res, { imageUrl, aboutData });
  } catch (error) {
    console.error('Error in uploadTeamImage:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};
