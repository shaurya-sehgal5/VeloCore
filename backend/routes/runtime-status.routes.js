const router = require("express").Router();

const controller = require("../controllers/runtime-status.controller");

router.get(
  "/:deploymentId/stream",
  controller.stream
);

module.exports = router;