const express = require("express");
const { subscribe, getAllSubscriptions } = require("../push/subscribe");
const { sendNotification } = require("../push/sendNotification");

const router = express.Router();

router.post("/subscribe", subscribe);
router.post("/notify", sendNotification);

router.get("/getAllSubscriptions", getAllSubscriptions); // ✅ NEW ROUTE
module.exports = router;
