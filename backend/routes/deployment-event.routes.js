const router = require("express").Router();

const controller = require("../controllers/deployment-event.controller");

router.get(
  "/:deploymentId/events",
  controller.list
);

router.get(
  "/:deploymentId/timeline",
  controller.list
);

module.exports = router;