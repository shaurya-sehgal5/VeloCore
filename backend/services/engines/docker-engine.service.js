const dockerService = require("../docker.service");
const statusService = require("../status.service");
const portService = require("../port.service");
const logger = require("../logger.service");
const envService = require("../env.service");
const runtimeRegistry = require("../runtime-registry.service");

class DockerEngine {

  async deploy({

    deploymentId,
    workspace,
    buildPlan,
    repository,
    env

  }) {

    /*
    ------------------------------------
    Build Image
    ------------------------------------
    */

    await statusService.update(
      deploymentId,
      "BUILDING"
    );

    await dockerService.buildImage({

      imageName: buildPlan.imageName,

      dockerfile: buildPlan.dockerfile,

      context: repository.repository,

      buildContext: buildPlan.buildContext,

      deploymentId

    });

    /*
    ------------------------------------
    Start Runtime
    ------------------------------------
    */

    await statusService.update(
      deploymentId,
      "DEPLOYING"
    );

    const hostPort = await portService.allocate();

    const containerName = buildPlan.containerName;

    const deploymentEnv = await envService.get(
      deploymentId
    );

    const runtime = await dockerService.runContainer({

      imageName: buildPlan.imageName,

      containerName,

      hostPort,

      containerPort: buildPlan.containerPort,

      buildPlan,

      env: {

        ...deploymentEnv,

        ...env

      },

      deploymentId

    });

    /*
    ------------------------------------
    Give container time to boot
    ------------------------------------
    */

    await new Promise(resolve =>
      setTimeout(resolve, 3000)
    );

    /*
    ------------------------------------
    Startup Logs
    ------------------------------------
    */

    const logs = await dockerService.execute(

      "docker",

      [

        "logs",

        runtime.containerId

      ],

      deploymentId

    );

    logger.deployment(
      deploymentId,
      logs
    );

    /*
    ------------------------------------
    Register Runtime
    ------------------------------------
    */

    await runtimeRegistry.register({

      deploymentId,

      name: buildPlan.projectName,

      type: buildPlan.type,

      framework: buildPlan.framework,

      imageName: runtime.imageName,

      containerName,

      hostPort,

      containerPort: runtime.containerPort

    });

    /*
    ------------------------------------
    Runtime Info
    ------------------------------------
    */

    return {

      deploymentId,

      workspace,

      project: buildPlan.projectName,

      type: buildPlan.type,

      framework: buildPlan.framework,

      imageName: runtime.imageName,

      containerName,

      hostPort,

      containerPort: runtime.containerPort

    };

  }

}

module.exports = new DockerEngine();