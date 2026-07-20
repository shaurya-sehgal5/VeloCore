const express = require("express");

const router = express.Router();

const securityController = require("../controllers/security.controller");

router.get(
    "/:deploymentId",
    securityController.getReport
);

module.exports = router;