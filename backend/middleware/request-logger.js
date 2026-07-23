const loki = require("../services/monitoring/loki/loki.service");

module.exports = async (req, res, next) => {
    const start = Date.now();

    res.on("finish", async () => {
        await loki.push({
            deploymentId: "system",
            project: "backend",
            stage: "HTTP",
            level:
                res.statusCode >= 500
                    ? "ERROR"
                    : res.statusCode >= 400
                    ? "WARN"
                    : "INFO",
            message: `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
        });
    });

    next();
};