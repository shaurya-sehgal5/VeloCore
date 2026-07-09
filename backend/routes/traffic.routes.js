const router = require("express").Router();

const controller = require("../controllers/traffic.controller");

router.post(
  "/:deploymentId/switch",
  controller.switch
);

router.get(
  "/:deploymentId/active-slot",
  controller.active
);

module.exports = router;