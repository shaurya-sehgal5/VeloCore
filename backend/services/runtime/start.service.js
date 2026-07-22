const runtimeResolver = require("./runtime-resolver.service");
const runtimeAction = require("./runtime-action.service");
const db = require("../../config/db");
const kubectl = require("../kubernetes/kubectl.service");
const portForwardService = require("../kubernetes/port-forward.service");

class StartService {
  async start(deploymentId) {
    const runtime =
      await runtimeResolver.resolve(deploymentId);

    if (!runtime) {
      throw new Error("Runtime not found.");
    }

    await runtimeAction.start(runtime);

    await kubectl.rollout(
      runtime.deployment,
      runtime.namespace
    );

    await portForwardService.start(
      runtime.service,
      runtime.namespace,
      runtime.container_port
    );

    await db.query(
      `
UPDATE deployment_services
SET status='RUNNING'
WHERE deployment_id=$1
`,
      [deploymentId]
    );

    return runtime;
  }
}

module.exports = new StartService();