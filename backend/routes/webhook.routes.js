const express = require("express");
const router = express.Router();

const {
  githubWebhook,
} = require("../controllers/webhook.controller");

router.post("/github", githubWebhook);

module.exports = router;