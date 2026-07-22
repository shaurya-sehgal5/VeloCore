const router = require("express").Router();

const controller = require("../controllers/runtime-action.controller");

router.post("/:deploymentId/restart", controller.restart);

router.post("/:deploymentId/start", controller.start);

router.post("/:deploymentId/stop", controller.stop);

router.delete("/:deploymentId", controller.destroy);

module.exports = router;