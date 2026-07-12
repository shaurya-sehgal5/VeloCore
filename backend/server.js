const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const envRoutes = require("./routes/env.routes");
const projectRoutes = require("./routes/project.routes");
const authRoutes = require("./routes/auth.routes");
const { initSocket } = require("./config/socket");
const dashboardRoutes = require("./routes/dashboard.routes");
const deploymentServicesRoutes = require("./routes/deployment-services.routes");
const runtimeMonitor = require("./services/runtime/runtime-monitor.service");
const redeployRoutes = require("./routes/redeploy.routes");
const metricsRoutes = require("./routes/metrics.routes");
const runtimeDiscovery = require("./services/runtime/runtime-discovery.service");
const gitRoutes = require("./routes/git.routes");
const githubWebhookRoutes = require("./routes/github-webhook.routes");
require("dotenv").config();
// 🐳 THE CORRECT ISOLATED SERVICE: Import the explicit Docker orchestration engine
const {
  processOneClickDeployment,
} = require("./services/deployment/deployment.orchestrator");

const app = express();
const server = http.createServer(app);

// Initialize WebSockets and catch the returned 'io' instance
const io = initSocket(server);

// Expose io instance to the global Express app instance before mounting routes
app.set("io", io);

// --- 1. GLOBAL MIDDLEWARES ---
app.use(
  "/api/github/webhook",
  express.raw({
    type: "application/json",
  }),
);

app.use(express.json());

app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:8080",
    ],
    credentials: true,
  }),
);

// --- 2. 📊 METRICS ROUTE ---

// --- 3. PRODUCTION AUTOMATION PIPELINES ---
app.post("/api/deploy/one-click", async (req, res) => {
  const ioInstance = req.app.get("io");
  const { deploymentId, gitLocalPath, envText, targetType } = req.body;

  const targetDeploymentId = deploymentId || `dep-${Date.now()}`;
  const targetPath = gitLocalPath || process.cwd();
  const appCategory = targetType || "backend";

  // Broadcast pipeline initialization to the terminal logs panel instantly
  if (ioInstance) {
    ioInstance
      .to(targetDeploymentId)
      .emit(
        "live_logs",
        `🔄 [Pipeline Initiated]: Isolating context layer for execution inside container...`,
      );
  }

  // ⚡ STEP 1: Parse the raw multi-line .env text cleanly into an object map
  const parsedEnvVars = {};
  if (envText) {
    const lines = envText.split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");
        parsedEnvVars[key.trim()] = value.trim();
      }
    });
  }

  try {
    console.log(
      `🐳 [Server Core]: Directing build task strictly to isolated Docker Engine...`,
    );

    // ⚡ STEP 2: Force explicit execution through the clean Docker sandbox deployment pipeline
    const result = await processOneClickDeployment(
      targetPath,
      targetDeploymentId,
      parsedEnvVars,
      appCategory,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(`❌ Build pipeline validation crashed:`, error.message);

    // Fallback to emit failure logs cleanly to screen component
    if (ioInstance) {
      ioInstance
        .to(targetDeploymentId)
        .emit(
          "live_logs",
          `⚠️ [Production Build Error - ${targetDeploymentId}]: ${error.message}`,
        );
    }

    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- 4. CORE APPLICATION MODULES & ROUTE MOUNTING ---
app.use("/api/auth", authRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/env", envRoutes);
app.use("/api/deployments", deploymentServicesRoutes);
app.use("/api/deployments", require("./routes/runtime-action.routes"));
app.use("/api/deployments", require("./routes/runtime.routes"));
app.use("/api/deployments", require("./routes/traffic.routes"));
app.use("/api/deployments", require("./routes/rollback.routes"));
app.use("/api/deployments", require("./routes/deployment-event.routes"));
app.use("/api/deployments", require("./routes/runtime-status.routes"));
app.use("/api/deployments", require("./routes/runtime-group.routes"));
app.use("/api/deploy/redeploy", redeployRoutes);
app.use("/metrics", metricsRoutes);
app.use("/api/git", gitRoutes);
app.use("/api/github/webhook", githubWebhookRoutes);

// --- 5. ⚠️ CATCH-ALL 404 HANDLER ---
app.use((req, res) => {
  console.log(
    `⚠️ [Server 404 Alert]: Unmapped request path: ${req.method} ${req.url}`,
  );
  res
    .status(404)
    .json({ error: `The endpoint path ${req.url} does not exist.` });
});

(async () => {
  await runtimeDiscovery.recover();

  runtimeMonitor.start();
})();

process.on("SIGINT", async () => {
  console.log("🛑 Shutting down...");

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down...");

  process.exit(0);
});

// --- 6. SERVER START ---
const PORT = 8080;
server.listen(PORT, () => {
  console.log(
    `🚀 VeloCore Control Plane running smoothly on unified port ${PORT}`,
  );
});
