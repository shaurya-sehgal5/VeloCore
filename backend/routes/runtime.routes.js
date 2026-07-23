const router = require("express").Router();
const runtimeController = require("../controllers/runtime.controller");
router.get("/:deploymentId/runtime", runtimeController.list);
router.get("/runtime", runtimeController.live);
router.get("/runtime/:deploymentId", runtimeController.get);
router.get("/:deploymentId/group", runtimeController.group);
router.get("/all", runtimeController.all);
module.exports = router;
