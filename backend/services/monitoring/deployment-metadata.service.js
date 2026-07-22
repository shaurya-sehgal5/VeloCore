const client = require("./prometheus.service");

const deploymentInfo = new client.Gauge({
  name: "velocore_deployment_info",
  help: "Deployment metadata",
  labelNames: [
    "deployment",
    "project",
    "namespace",
    "pod",
    "node",
    "service",
    "image",
    "runtime",
    "framework",
    "branch"
  ]
});

const deploymentReplicas = new client.Gauge({
  name: "velocore_deployment_replicas",
  help: "Deployment replicas",
  labelNames: ["deployment","namespace"]
});

const deploymentReadyReplicas = new client.Gauge({
  name: "velocore_deployment_ready_replicas",
  help: "Deployment ready replicas",
  labelNames: ["deployment","namespace"]
});

const deploymentContainerStatus = new client.Gauge({
  name:"velocore_deployment_container_status",
  help:"Container running status",
  labelNames:["deployment","namespace"]
});

module.exports={
    deploymentInfo,
    deploymentReplicas,
    deploymentReadyReplicas,
    deploymentContainerStatus
};