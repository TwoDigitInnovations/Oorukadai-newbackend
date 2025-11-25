const Content = require("@models/contentManagement");
const response = require("../responses")

exports.createContent = async (req, res) => {
  try {
    const { 
      termsAndConditions, 
      privacy, 
      returnPolicy,
      aboutPage
    } = req.body;

    const existingContent = await Content.findOne();

    if (existingContent) {
      const updateData = { termsAndConditions, privacy, returnPolicy };
      
      // Only update aboutPage if it's provided in the request
      if (aboutPage) {
        updateData.aboutPage = {
          ...existingContent.aboutPage.toObject(),
          ...aboutPage
        };
      }

      const updatedContent = await Content.findOneAndUpdate(
        {},
        updateData,
        { new: true }
      );

      return response.success(res, 'Content updated successfully', updatedContent);
    }

    const newContent = new Content({
      termsAndConditions,
      privacy,
      returnPolicy,
      aboutPage: aboutPage || {}
    });

    await newContent.save();
    return response.success(res, 'Content created successfully', newContent, 201);
  } catch (error) {
    console.error('Error in createContent:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};

exports.updateAboutPage = async (req, res) => {
  try {
    const { aboutPage } = req.body;
    
    if (!aboutPage) {
      return response.error(res, 'About page data is required', 400);
    }

    const existingContent = await Content.findOne();
    let updatedContent;

    if (existingContent) {
      updatedContent = await Content.findOneAndUpdate(
        {},
        { 
          $set: { 
            'aboutPage': {
              ...existingContent.aboutPage.toObject(),
              ...aboutPage
            }
          } 
        },
        { new: true, upsert: true }
      );
    } else {
      const newContent = new Content({
        aboutPage: aboutPage
      });
      updatedContent = await newContent.save();
    }

    return response.success(res, 'About page updated successfully', updatedContent);
  } catch (error) {
    console.error('Error in updateAboutPage:', error);
    return response.error(res, 'Internal Server Error', 500);
  }
};


exports.getContent = async (req, res) => {
  try {
    const content = await Content.find();
    if (!content) {
      return res.status(404).json({ message: 'Content not found. Please create content first.' });
    }
    return response.success(res, content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const { termsAndConditions, privacy, returnPolicy, id } = req.body;

    const updatedContent = await Content.findByIdAndUpdate(
      id,
      { termsAndConditions, privacy, returnPolicy },
      { new: true }
    );
    if (!updatedContent) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.status(200).json({ message: 'Content updated successfully', data: updatedContent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
