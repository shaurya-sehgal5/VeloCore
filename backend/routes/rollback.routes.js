const router = require("express").Router();
const controller = require("../controllers/rollback.controller");

router.post(
  "/:deploymentId/rollback",
  controller.rollback
);

module.exports = router;