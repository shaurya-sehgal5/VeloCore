const express = require("express");

const router = express.Router();

const envController = require("../controllers/env.controller");

router.get(
    "/:deploymentId",
    envController.get
);

router.post(
    "/:deploymentId",
    envController.save
);

module.exports = router;