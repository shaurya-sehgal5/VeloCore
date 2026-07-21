const kubectl = require("./kubectl.service");

class RolloutMonitor {
  async wait(name, namespace = "default") {
    try {
      // Execute standard rollout watch
      return await kubectl.execute([
        "rollout",
        "status",
        `deployment/${name}`,
        "-n",
        namespace,
        "--timeout=60s"
      ]);
    } catch (error) {
      // Rollout failed or timed out -> Run Automated Failure Diagnosis
      const diagnostics = await this.diagnoseFailure(name, namespace);
      throw new Error(diagnostics);
    }
  }

  async diagnoseFailure(deploymentName, namespace) {
    try {
      // 1. Fetch the absolute latest pod state metadata for this deployment group
      const jsonOutput = await kubectl.execute([
        "get",
        "pods",
        "-l",
        `app=${deploymentName}`,
        "-n",
        namespace,
        "-o",
        "json",
      ]);

      const podData = JSON.parse(jsonOutput);
      if (!podData.items || podData.items.length === 0) {
        return `Deployment "${deploymentName}" failed during rollout. Reason: No underlying pods were provisioned by the cluster controller.`;
      }

      // Target the most recently instantiated active pod
      const latestPod = podData.items[0];
      const containerStatus = latestPod.status?.containerStatuses?.[0];
      const waitingState = containerStatus?.state?.waiting;
      const terminatedState = containerStatus?.state?.terminated;

      const baseErrorMsg = `❌ Rollout Timeout for "${deploymentName}". `;

      // Heuristic 1: Analyze Waiting States (Image Issues or Configuration Blocks)
      if (waitingState) {
        const reason = waitingState.reason; // e.g., ImagePullBackOff, ErrImagePull
        if (reason === "ImagePullBackOff" || reason === "ErrImagePull") {
          return `${baseErrorMsg}\n[Root Cause]: Cluster state trapped in ${reason}.\n[Suggested Fix]: Your Kind local cluster cannot reach this image. Ensure you execute "kind load docker-image ${containerStatus.image}" via your Node.js builder engine before running the rollout engine.`;
        }
        if (reason === "CrashLoopBackOff") {
          return `${baseErrorMsg}\n[Root Cause]: Cluster state trapped in CrashLoopBackOff.\n[Suggested Fix]: The application process compiled safely but crashed instantly upon execution. Verify your start command or inspect missing Runtime Environment Variables.`;
        }
        return `${baseErrorMsg}\n[K8s State]: Waiting - ${reason}. Message: ${waitingState.message}`;
      }

      // Heuristic 2: Analyze Terminated States (Resource Bounds Exhausted)
      if (terminatedState) {
        if (terminatedState.reason === "OOMKilled") {
          return `${baseErrorMsg}\n[Root Cause]: Container was dynamically terminated via OOMKilled (Exit Code 137).\n[Suggested Fix]: The application exceeded its maximum runtime memory limitations. Increase your template allocations within resources.limits.memory.`;
        }
        return `${baseErrorMsg}\n[K8s State]: Terminated - ${terminatedState.reason}. Exit Code: ${terminatedState.exitCode}`;
      }

      // Heuristic 3: Unhealthy Probes Check
      const conditions = latestPod.status?.conditions || [];
      const readyCondition = conditions.find(c => c.type === "Ready");
      if (readyCondition && readyCondition.status === "False") {
        return `${baseErrorMsg}\n[Root Cause]: Application container is running but failing its Liveness/Readiness network probes.\n[Suggested Fix]: Ensure your code exposes a valid response listener matching healthCheck.path and containerPort configuration profiles.`;
      }

      return `${baseErrorMsg} Check cluster event streams for deep diagnostics.`;
    } catch (diagError) {
      return `Deployment rollout failed, and diagnostic engine suffered an execution error: ${diagError.message}`;
    }
  }
}

module.exports = new RolloutMonitor();