const router = require("express").Router();

const controller = require("../controllers/runtime-action.controller");

router.post("/:deploymentId/restart", controller.restart);

router.post("/:deploymentId/stop", controller.stop);

router.delete("/:deploymentId", controller.destroy);

router.get("/:deploymentId/logs", controller.logs);

router.get("/:deploymentId/stats", controller.stats);

module.exports = router;