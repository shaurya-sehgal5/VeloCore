const router = require("express").Router();
const httpProxy = require("http-proxy");
const db = require("../config/db");

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
});

async function getHostPort(deploymentId) {
  const deployment = await db.query(
    `
    SELECT active_slot
    FROM deployments
    WHERE id=$1
    `,
    [deploymentId]
  );

  if (!deployment.rows.length) {
    return null;
  }

  const slot = deployment.rows[0].active_slot;

  let runtime = await db.query(
    `
    SELECT host_port
    FROM deployment_services
    WHERE deployment_id=$1
    AND slot=$2
    AND type='frontend'
    LIMIT 1
    `,
    [deploymentId, slot]
  );

  if (!runtime.rows.length) {
    runtime = await db.query(
      `
      SELECT host_port
      FROM deployment_services
      WHERE deployment_id=$1
      AND slot=$2
      AND type='backend'
      LIMIT 1
      `,
      [deploymentId, slot]
    );
  }

  if (!runtime.rows.length) {
    return null;
  }

  return runtime.rows[0].host_port;
}

router.use("/:deploymentId", async (req, res) => {
  try {
    const deploymentId = req.params.deploymentId;

    const port = await getHostPort(deploymentId);

    if (!port) {
      return res.status(404).send("Deployment not found");
    }

    req.url = req.originalUrl.replace(`/visit/${deploymentId}`, "");

    if (req.url === "") {
      req.url = "/";
    }

    proxy.web(req, res, {
      target: `http://localhost:${port}`,
    });
  } catch (err) {
    console.error(err);

    res.status(500).send("Proxy Error");
  }
});

proxy.on("error", (err, req, res) => {
  console.error(err);

  if (!res.headersSent) {
    res.status(502).send("Container unavailable");
  }
});

module.exports = router;