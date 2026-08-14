const { spawn } = require("child_process");
const logger = require("../monitoring/logger.service");
const logParser = require("../monitoring/log-parser.service");
const metrics = require("../monitoring/metrics.service");

class DockerService {
  constructor() {
    this.lastMessage = new Map();
  }

  /*
  ==================================================
  DOCKER COMMAND EXECUTION
  ==================================================
  */

  execute(command, args, deploymentId, stage = "BUILD", projectName = null) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
        env: {
          ...process.env,
          DOCKER_BUILDKIT: "1",
        },
      });

      let output = "";

      const stream = (data) => {
        const text = data.toString();

        output += text;

        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        for (const line of lines) {
          const cleaned = line
            .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
            .trim();

          if (!cleaned) continue;

          const parsed = logParser.parse(cleaned);

          if (!parsed) continue;

          if (this.lastMessage.get(deploymentId) === parsed) {
            continue;
          }

          this.lastMessage.set(deploymentId, parsed);

          logger.live(
            deploymentId,
            stage,
            "INFO",
            parsed,
            projectName
          );
        }
      };

      child.stdout.on(
        "data",
        (data) => stream(data, "INFO")
      );

      child.stderr.on(
        "data",
        (data) => stream(data, "ERROR")
      );

      child.on("error", reject);

      child.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(output)
          );
        }

        resolve(output);
      });
    });
  }

  /*
  ==================================================
  SILENT COMMAND
  ==================================================
  */

  executeSilent(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
        env: {
          ...process.env,
          DOCKER_BUILDKIT: "1",
        },
      });

      let output = "";

      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.stderr.on("data", (data) => {
        output += data.toString();
      });

      child.on("error", reject);

      child.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(output)
          );
        }

        resolve(output);
      });
    });
  }

  /*
  ==================================================
  BUILD IMAGE
  ==================================================
  */

  async buildImage({
    imageName,
    dockerfile,
    context,
    buildContext,
    deploymentId,
  }) {
    const fs = require("fs");

    await logger.milestone(
      deploymentId,
      "BUILD_STARTED",
      "BUILD",
      "Building Docker image..."
    );

    await logger.info(
      deploymentId,
      "BUILD",
      `Dockerfile: ${dockerfile}`
    );

    await logger.info(
      deploymentId,
      "BUILD",
      `Build context: ${context}`
    );

    await logger.info(
      deploymentId,
      "BUILD",
      `Image: ${imageName}`
    );

    if (!dockerfile) {
      throw new Error(
        `No Dockerfile resolved for ${imageName}`
      );
    }

    if (!fs.existsSync(dockerfile)) {
      throw new Error(
        `Dockerfile does not exist: ${dockerfile}`
      );
    }

    if (!fs.existsSync(context)) {
      throw new Error(
        `Build context does not exist: ${context}`
      );
    }

    return this.execute(
      "docker",
      [
        "build",
        "--rm",
        "--pull=false",
        "--progress=plain",
        "--build-arg",
        "BUILDKIT_INLINE_CACHE=1",
        "--label",
        "velocore.build=true",
        "-t",
        imageName,
        "-f",
        dockerfile,
        context,
      ],
      deploymentId,
      "BUILD"
    );
  }

  /*
  ==================================================
  RUN CONTAINER
  ==================================================
  */

  async runContainer({
    imageName,
    containerName,
    hostPort,
    containerPort,
    buildPlan,
    env = {},
    network,
    deploymentId,
  }) {
    const args = [
      "run",
      "-d",
      "--init",

      "--name",
      containerName,

      "--restart",
      "unless-stopped",
    ];

    args.push(
      "--label",
      "velocore.build=true",

      "--label",
      `build.time=${Date.now()}`,

      "--label",
      `deploymentId=${deploymentId}`,

      "--label",
      `project=${buildPlan.projectName}`,

      "--label",
      `slot=${buildPlan.slot}`,

      "--label",
      `namespace=velocore-${buildPlan.projectName}`,

      "--label",
      `framework=${buildPlan.framework}`,

      "--label",
      `type=${buildPlan.type}`,

      "--label",
      `hostPort=${hostPort}`,

      "--label",
      `containerPort=${containerPort}`,

      "--label",
      `imageName=${imageName}`,
    );

    if (network) {
      args.push("--network", network);
    }

    args.push(
      "-p",
      `${hostPort}:${containerPort}`
    );

    for (const [key, value] of Object.entries(env || {})) {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        continue;
      }

      args.push("-e");
      args.push(`${key}=${value}`);
    }

    args.push(imageName);

    if (buildPlan.startCommand) {
      args.push("sh");
      args.push("-c");
      args.push(buildPlan.startCommand);
    }

    await logger.milestone(
      deploymentId,
      "RUNTIME_STARTED",
      "RUNTIME",
      "Starting container..."
    );

    await logger.info(
      deploymentId,
      "RUNTIME",
      "Preparing runtime environment..."
    );

    return new Promise((resolve, reject) => {
      const started = Date.now();

      const child = spawn(
        "docker",
        args,
        {
          shell: false,
        }
      );

      let output = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        output += data.toString();

        logger.detail(
          deploymentId,
          "DOCKER",
          "INFO",
          data.toString().trim()
        );
      });

      child.stderr.on("data", (data) => {
        const text = data.toString();

        stderr += text;

        logger.detail(
          deploymentId,
          "DOCKER",
          "ERROR",
          text.trim()
        );
      });

      child.on("close", async (code) => {
        if (code !== 0) {
          await logger.error(
            deploymentId,
            "RUNTIME",
            "Failed to start container."
          );

          return reject(
            new Error(
              stderr ||
              "Failed to start container."
            )
          );
        }

        const containerId =
          output.trim();

        await logger.milestone(
          deploymentId,
          "DEPLOYMENT_COMPLETED",
          "RUNTIME",
          "Application is now running."
        );

        metrics.runtimeEvents
          .labels("START")
          .inc();

        metrics.runtimeStartupDuration.observe(
          (Date.now() - started) / 1000
        );

        metrics.runtimeStartupLatest
          .labels(deploymentId)
          .set(
            (Date.now() - started) / 1000
          );

        resolve({
          containerId,
          containerName,
          imageName,
          hostPort,
          containerPort,
        });
      });

      child.on("error", reject);
    });
  }

  /*
  ==================================================
  PUSH IMAGE
  ==================================================
  */

  async pushImage(
    imageName,
    deploymentId
  ) {
    await logger.info(
      deploymentId,
      "REGISTRY",
      `Pushing ${imageName} to Docker Hub...`
    );

    await this.execute(
      "docker",
      [
        "push",
        imageName,
      ],
      deploymentId
    );

    await logger.success(
      deploymentId,
      "REGISTRY",
      "Image pushed successfully."
    );
  }

  async stopContainer(name) {
    return this.execute(
      "docker",
      ["stop", name]
    );
  }

  async imageExists(image) {
    try {
      await this.executeSilent(
        "docker",
        [
          "image",
          "inspect",
          image,
        ]
      );

      return true;
    } catch {
      return false;
    }
  }

  async removeContainer(name) {
    return this.execute(
      "docker",
      ["rm", "-f", name]
    );
  }

  async removeImage(image) {
    return this.execute(
      "docker",
      ["rmi", "-f", image]
    );
  }

  async createNetwork(network) {
    return this.execute(
      "docker",
      ["network", "create", network]
    );
  }

  async removeNetwork(network) {
    return this.execute(
      "docker",
      ["network", "rm", network]
    );
  }

  async listContainers() {
    const output =
      await this.executeSilent(
        "docker",
        [
          "ps",
          "-q",
          "--filter",
          "label=velocore=true",
        ]
      );

    return output
      .trim()
      .split("\n")
      .filter(Boolean);
  }

  async inspectContainer(containerId) {
    const output =
      await this.executeSilent(
        "docker",
        [
          "inspect",
          containerId,
        ]
      );

    return JSON.parse(output)[0];
  }
}

module.exports =
  new DockerService();