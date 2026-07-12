const router = require("express").Router();

const controller = require("../controllers/git.controller");

router.get("/:projectId", controller.getSettings);

router.patch("/:projectId", controller.updateSettings);

router.post("/:projectId/webhook", controller.createWebhook);

module.exports = router;
