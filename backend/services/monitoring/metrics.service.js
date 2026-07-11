const client = require("./prometheus.service");

const deployments = new client.Counter({
    name: "velocore_deployments_total",
    help: "Total deployments"
});

const failedDeployments = new client.Counter({
    name: "velocore_failed_deployments_total",
    help: "Failed deployments"
});

const runningDeployments = new client.Gauge({
    name: "velocore_running_deployments",
    help: "Running deployments"
});

const buildDuration = new client.Histogram({
    name: "velocore_build_duration_seconds",
    help: "Deployment duration",
    buckets: [1,5,10,20,30,60,120]
});

const queueJobs = new client.Gauge({
  name: "velocore_queue_jobs",
  help: "Current jobs waiting in queue",
});

const runtimeCount = new client.Gauge({

  name:"velocore_runtime_count",

  help:"Running runtime containers"

});

module.exports = {
    client,

    deployments,

    failedDeployments,

    runningDeployments,

    buildDuration , 

    queueJobs,

    runtimeCount,
};