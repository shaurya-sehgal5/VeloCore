const router = require("express").Router();

const controller = require("../controllers/deployment-services.controller");

router.get(

    "/:deploymentId/services",

    controller.getServices

);

module.exports = router;