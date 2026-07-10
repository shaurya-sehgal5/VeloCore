const router = require("express").Router();

const controller = require("../controllers/runtime-group.controller");

router.get(
  "/:deploymentId/group",
  controller.list
);

module.exports = router;