const express = require("express");
const httpProxy = require("http-proxy");
const db = require("./config/db");

const app = express();
const proxy = httpProxy.createProxyServer({
    ws: true,
    changeOrigin: true
});

const PORT = 8000;

// Cache deployment -> port for asset requests
const deploymentCache = new Map();

async function getHostPort(deploymentId) {

    if (deploymentCache.has(deploymentId)) {
        return deploymentCache.get(deploymentId);
    }

    const result = await db.query(
        `
        SELECT host_port
        FROM deployments
        WHERE id = $1
        `,
        [deploymentId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const port = result.rows[0].host_port;

    deploymentCache.set(deploymentId, port);

    return port;
}

// Handle ALL requests
app.use(async (req, res) => {

    try {

        let deploymentId = null;

        // Direct request
        const match = req.originalUrl.match(/^\/visit\/([^\/]+)/);

        if (match) {

            deploymentId = match[1];

            req.url = req.originalUrl.replace(
                `/visit/${deploymentId}`,
                ""
            );

            if (req.url === "") {
                req.url = "/";
            }

        } else {

            // Asset request
            const referer = req.headers.referer;

            if (!referer) {
                return res.status(404).send("Deployment context missing.");
            }

            const refMatch = referer.match(/\/visit\/([^\/]+)/);

            if (!refMatch) {
                return res.status(404).send("Deployment context missing.");
            }

            deploymentId = refMatch[1];

        }

        const port = await getHostPort(deploymentId);

        if (!port) {
            return res.status(404).send("Deployment not found.");
        }

        proxy.web(req, res, {
            target: `http://localhost:${port}`
        });

    } catch (err) {

        console.error(err);

        res.status(500).send("Proxy Error");

    }

});

proxy.on("error", (err, req, res) => {

    console.error(err);

    if (!res.headersSent) {
        res.status(502).send("Container unavailable.");
    }

});

app.listen(PORT, () => {

    console.log(
        `🚀 Reverse Proxy running at http://localhost:${PORT}`
    );

});