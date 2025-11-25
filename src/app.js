const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("@config/db");
const passport = require("passport");
require("@config/passport"); // Initialize passport strategies

// Load environment variables
require("dotenv").config();

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

const corsOptions = {
  origin: '*',
 
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(corsOptions));

// app.options('*', cors(corsOptions));

app.use(helmet());
app.use(morgan("dev"));
app.use(passport.initialize());

// Routes
const routes = require('./routes');
routes(app);


// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;