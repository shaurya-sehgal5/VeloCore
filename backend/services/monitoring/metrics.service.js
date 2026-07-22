const client = require("./prometheus.service");

const deployments = new client.Counter({
  name: "velocore_deployments_total",
  help: "Deployment count",
  labelNames: ["status", "runtime", "framework"],
});

const runningDeployments = new client.Gauge({
  name: "velocore_running_deployments",
  help: "Running deployments",
});

const runtimeEvents = new client.Counter({
  name: "velocore_runtime_events_total",
  help: "Runtime events",
  labelNames: ["action"],
});

const securityScans = new client.Counter({
  name: "velocore_security_scans_total",
  help: "Security scans",
  labelNames: ["scanner", "status"],
});
const queueJobs = new client.Counter({
  name: "velocore_queue_jobs_total",
  help: "Queue jobs",
  labelNames: ["status"],
});

const deploymentStatus = new client.Gauge({
  name: "velocore_deployment_status",
  help: "Deployment status (1=running, 0=stopped)",
  labelNames: ["deployment", "project", "namespace"],
});

const deploymentUptime = new client.Gauge({
  name: "velocore_deployment_uptime_seconds",
  help: "Deployment uptime in seconds",
  labelNames: ["deployment", "project", "namespace"],
});

const deploymentRestarts = new client.Gauge({
  name: "velocore_deployment_restarts_total",
  help: "Deployment restart count",
  labelNames: ["deployment", "project", "namespace"],
});

const runtimeCount = new client.Gauge({
  name: "velocore_running_runtimes",
  help: "Running runtime containers",
});

const containerCpu = new client.Gauge({
  name: "velocore_container_cpu_percent",
  help: "Container CPU usage percentage",
  labelNames: ["deployment", "project"],
});

const containerMemory = new client.Gauge({
  name: "velocore_container_memory_bytes",
  help: "Container memory usage in bytes",
  labelNames: ["deployment", "project"],
});
const queueWaiting = new client.Gauge({
  name: "velocore_queue_waiting",
  help: "Waiting queue jobs",
});

const queueActive = new client.Gauge({
  name: "velocore_queue_active",
  help: "Active queue jobs",
});

const queueDelayed = new client.Gauge({
  name: "velocore_queue_delayed",
  help: "Delayed queue jobs",
});
const containerNetworkRx = new client.Gauge({
  name: "velocore_container_network_receive_bytes",
  help: "Container network received bytes",
  labelNames: ["deployment", "project"],
});
const securityScore = new client.Gauge({
  name: "velocore_security_score",
  help: "Security score",
  labelNames: ["project"],
});

const securityCritical = new client.Gauge({
  name: "velocore_security_critical",
  help: "Critical vulnerabilities",
  labelNames: ["project"],
});

const securityHigh = new client.Gauge({
  name: "velocore_security_high",
  help: "High vulnerabilities",
  labelNames: ["project"],
});

const securityMedium = new client.Gauge({
  name: "velocore_security_medium",
  help: "Medium vulnerabilities",
  labelNames: ["project"],
});

const securityLow = new client.Gauge({
  name: "velocore_security_low",
  help: "Low vulnerabilities",
  labelNames: ["project"],
});
const deploymentDuration = new client.Histogram({
  name: "velocore_deployment_duration_seconds",
  help: "Deployment duration",
  labelNames: ["status"],
  buckets: [5, 10, 20, 30, 60, 120, 300],
});

const stageDuration = new client.Histogram({
  name: "velocore_stage_duration_seconds",
  help: "Stage duration",
  labelNames: ["stage"],
  buckets: [.1, .5, 1, 2, 5, 10, 20, 30, 60, 120],
});

const buildDuration = new client.Histogram({
  name: "velocore_build_duration_seconds",
  help: "Docker build duration",
  labelNames: ["project"],
  buckets: [1, 5, 10, 20, 30, 60, 120],
});

const securityDuration = new client.Histogram({
  name: "velocore_security_duration_seconds",
  help: "Security scan duration",
  labelNames: ["scanner"],
  buckets: [.5, 1, 2, 5, 10, 20, 30, 60],
});

const rolloutDuration = new client.Histogram({
  name: "velocore_rollout_duration_seconds",
  help: "Kubernetes rollout duration",
  buckets: [1, 5, 10, 20, 30, 60],
});

const runtimeStartupDuration = new client.Histogram({
  name: "velocore_runtime_startup_seconds",
  help: "Runtime startup",
  buckets: [1, 2, 5, 10, 20],
});
const containerNetworkTx = new client.Gauge({
  name: "velocore_container_network_transmit_bytes",
  help: "Container network transmitted bytes",
  labelNames: ["deployment", "project"],
});

const containerPids = new client.Gauge({
  name: "velocore_container_pids",
  help: "Container running processes",
  labelNames: ["deployment", "project"],
});

module.exports = {
  client,

  deployments,

  runningDeployments,

  deploymentDuration,

  queueJobs,

  stageDuration,

  runtimeCount,

  containerCpu,

  containerMemory,

  containerNetworkRx,

  containerNetworkTx,

  containerPids,

  runtimeEvents,

  securityScans,

  queueWaiting,

  queueActive,

  queueDelayed,

  securityScore,

  securityCritical,

  securityHigh,

  securityMedium,

  securityLow,

  buildDuration,

  deploymentStatus,
  
  deploymentUptime,

  deploymentRestarts,

  securityDuration,

  rolloutDuration,

  runtimeStartupDuration,
};
