const router = require("express").Router();

const runtimeController = require("../controllers/runtime.controller");

/*
------------------------------------
Database Runtime
------------------------------------
*/

router.get("/:deploymentId/runtime", runtimeController.list);

/*
------------------------------------
Live Runtime List
------------------------------------
*/

router.get("/runtime", runtimeController.live);

/*
------------------------------------
Single Live Runtime
------------------------------------
*/

router.get("/runtime/:deploymentId", runtimeController.get);
router.get("/:deploymentId/group", runtimeController.group);
router.get("/all", runtimeController.all);
module.exports = router;
