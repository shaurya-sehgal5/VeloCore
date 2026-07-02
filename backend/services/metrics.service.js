const client = require('prom-client');

// Create a custom registry
const register = new client.Registry();

// Enable default metrics collection (CPU, Memory loop logs, garbage collection tracking)
client.collectDefaultMetrics({ register, prefix: 'velocore_' });

// Custom Metrics for your PaaS Operations
const compileDurationGauge = new client.Gauge({
  name: 'velocore_build_duration_seconds',
  help: 'Time taken by the Docker sandbox container to compile the user project.',
  labelNames: ['deploymentId', 'status']
});

const totalDeploymentsCounter = new client.Counter({
  name: 'velocore_deployments_total',
  help: 'Total number of deployment build requests triggered.',
  labelNames: ['status']
});

register.registerMetric(compileDurationGauge);
register.registerMetric(totalDeploymentsCounter);

module.exports = {
  register,
  compileDurationGauge,
  totalDeploymentsCounter
};