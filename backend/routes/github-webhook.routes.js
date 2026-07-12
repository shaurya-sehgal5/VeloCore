const router = require("express").Router();

const controller = require("../controllers/github-webhook.controller");

router.post("/", controller.receive);

module.exports = router;