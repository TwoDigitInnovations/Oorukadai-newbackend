const authRoutes = require("@routes/authRoutes");
const blogsRoutes = require("@routes/blogsRoutes");
const categoryRoutes = require("@routes/categoryRoutes");
const contentManagementRoutes = require("@routes/contentManagementRoutes");
const dashboardRoutes = require("@routes/dashboardRoutes");
const faqRoutes = require("@routes/faqRoutes");
const favouriteRoutes = require("@routes/favouriteRoutes");
const notificationRoutes = require("@routes/notificationRoutes");
const productRoutes = require("@routes/productRoutes");
const settingRoutes = require("@routes/settingRoutes");
const storeRoutes = require("@routes/storeRoutes");
const themeRoutes = require("@routes/themeRoutes");
const timeRoutes = require("@routes/timeRoutes");
const withdrawreqRoutes = require("@routes/withdrawreqRoutes");
const contactRoutes = require('@routes/contactRoutes')
const reviewRoutes = require('@routes/reviewRoutes')
const saleRoutes = require('@routes/saleRoutes')
const aboutRoutes = require('@routes/aboutRoutes')
const galleryRoutes = require('@routes/galleryRoutes')
// const walletRoutes = require('@routes/walletRoutes')
module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api', blogsRoutes);
  app.use('/api', categoryRoutes);
  app.use('/api', contentManagementRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api', faqRoutes);
  app.use('/api', favouriteRoutes);
  app.use('/api', notificationRoutes);
  app.use('/api', productRoutes);
  app.use('/api', settingRoutes);
  app.use('/api', storeRoutes);
  app.use('/api', themeRoutes);
  app.use('/api', timeRoutes);
  app.use('/api', withdrawreqRoutes);
  app.use('/api',contactRoutes)
  app.use('/api',reviewRoutes)
  app.use('/api',saleRoutes)
  app.use('/api',aboutRoutes)
  app.use('/api',galleryRoutes)
  // app.use('/api',walletRoutes)
};
