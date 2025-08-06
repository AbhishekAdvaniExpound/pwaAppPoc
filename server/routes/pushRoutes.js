const express = require("express");
const { subscribe } = require("../push/subscribe");
const { sendNotification } = require("../push/sendNotification");

const router = express.Router();

router.post("/subscribe", subscribe);
router.post("/notify", sendNotification);

module.exports = router;
