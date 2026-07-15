const router = require("express").Router();

const controller = require("../controllers/runtime-action.controller");

router.post("/:deploymentId/restart", controller.restart);

router.post("/:deploymentId/start", controller.start);

router.post("/:deploymentId/stop", controller.stop);

router.delete("/:deploymentId", controller.destroy);

router.get("/:deploymentId/logs", controller.logs);

router.get("/:deploymentId/stats", controller.stats);

// router.get("/:deploymentId/describe", controller.describe);

module.exports = router;