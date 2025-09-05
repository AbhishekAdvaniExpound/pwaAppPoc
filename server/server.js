const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const rateLimit = require("express-rate-limit");

const pushRoutes = require("./routes/pushRoutes");
const loginRoutes = require("./routes/loginRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");

const app = express();
app.use(cors());
app.use(express.json());
connectDB(); //  Connect MongoDB

// 5 requests per minute per IP for login
const loginLimiter = rateLimit({
  // windowMs: 60 * 1000, // 1 minute
  windowMs: 5 * 60 * 1000, // 5 minutes

  max: 5, // limit each IP to 5 requests per window
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Only apply limiter to login
app.use("/api/login", loginLimiter, loginRoutes);

// No limiter here
app.use("/api/push", pushRoutes);
app.use("/api/inquiryRoutes", inquiryRoutes);

app.get("/", (req, res) => {
  res.send("API is running ");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
