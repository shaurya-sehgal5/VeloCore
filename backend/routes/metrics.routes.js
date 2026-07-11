const router = require("express").Router();

const metrics = require("../services/monitoring/metrics.service");

router.get("/", async (_, res) => {

    res.set(
        "Content-Type",
        metrics.client.register.contentType
    );

    res.end(
        await metrics.client.register.metrics()
    );

});

module.exports = router;