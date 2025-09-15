// server/routes/loginRoutes.js
const express = require("express");
const {
  getInquiries,
  getInquiryDetail,
} = require("../controllers/inquiryController");

const router = express.Router();

router.get("/getInquiries", getInquiries);
router.get("/getInquiries/:inqno", getInquiryDetail);

module.exports = router;
