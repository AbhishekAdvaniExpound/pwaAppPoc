const express = require("express");
const { subscribe, getAllSubscriptions } = require("../push/subscribe");
const { sendNotification } = require("../push/sendNotification");

const router = express.Router();

router.post("/subscribe", subscribe);
router.post("/notify", sendNotification);


router.get('/subscriptions', getAllSubscriptions); // ✅ NEW ROUTE
module.exports = router;
