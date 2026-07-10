const router = require("express").Router();

const controller = require("../controllers/deployment-event.controller");

router.get(
  "/:deploymentId/events",
  controller.list
);

module.exports = router;