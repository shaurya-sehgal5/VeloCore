const router = require("express").Router();

const runtimeController = require("../controllers/runtime.controller");

router.get(

    "/:deploymentId/runtime",

    runtimeController.list

);

module.exports = router;