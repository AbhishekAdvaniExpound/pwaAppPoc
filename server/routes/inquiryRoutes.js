// server/routes/loginRoutes.js
const express = require("express");
const {
  getInquiries,
  getInquiryDetail,
  getNegotiation,
  postNegotiation,
} = require("../controllers/inquiryController");

const router = express.Router();

router.get("/getInquiries", getInquiries);
router.get("/getInquiries/:inqno", getInquiryDetail);

// Path param version: /api/negotiation/:inqno/:inqitem
router.get("/getNegotiation/:inqno/:inqitem", getNegotiation);

router.post("/postNegotiation", postNegotiation);

module.exports = router;
