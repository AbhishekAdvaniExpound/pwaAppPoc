const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pushRoutes = require("./routes/pushRoutes");
// const pushRoutes = require("./routes/pushRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/push", pushRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
