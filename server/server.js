const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

const pushRoutes = require("./routes/pushRoutes");
const loginRoutes = require("./routes/loginRoutes");

const app = express();
app.use(cors());
app.use(express.json());
connectDB(); //  Connect MongoDB

app.use("/api/push", pushRoutes);
app.use("/api", loginRoutes);

app.get("/", (req, res) => {
  res.send("API is running ");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
