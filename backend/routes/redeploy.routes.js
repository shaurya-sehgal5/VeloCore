const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/redeploy.controller");

router.post(
  "/:deploymentId",
  auth,
  controller.redeploy
);
module.exports = router;