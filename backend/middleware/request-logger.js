const loki = require("../services/monitoring/loki/loki.service");

const ignored = [
    "/metrics",
    "/api/health",
    "/favicon.ico",
    "/socket.io",
    "/api/dashboard",
    "/api/deployments",
];

module.exports = async (req, res, next) => {

    if (ignored.some(x => req.originalUrl.startsWith(x))) {
        return next();
    }

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

            message: `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
        });

    });

    next();
};