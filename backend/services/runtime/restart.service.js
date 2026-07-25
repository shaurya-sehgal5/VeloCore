const runtimeResolver = require("./runtime-resolver.service");
const runtimeAction = require("./runtime-action.service");
const kubectl = require("../kubernetes/kubectl.service");
const db = require("../../config/db");

class RestartService {

  async restart(deploymentId) {

    const runtime =
      await runtimeResolver.resolve(
        deploymentId
      );

    if (!runtime) {
      throw new Error(
        "Runtime not found."
      );
    }

    if (runtime.status === "STOPPED") {

      await runtimeAction.start(runtime);

    } else {

      await runtimeAction.restart(runtime);

    }

    await kubectl.rollout(
      runtime.deployment,
      runtime.namespace,
         deploymentId
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

module.exports =
  new RestartService();