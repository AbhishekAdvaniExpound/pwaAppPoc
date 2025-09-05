// server/routes/loginRoutes.js
const express = require("express");
const { getInquiries } = require("../controllers/inquiryController");

const router = express.Router();

router.get("/getInquiries", getInquiries);

module.exports = router;
