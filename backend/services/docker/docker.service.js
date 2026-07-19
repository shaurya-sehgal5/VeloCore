const { spawn } = require("child_process");
const logger = require("../monitoring/logger.service");
const logParser = require("../monitoring/log-parser.service");

class DockerService {
  execute(command, args, deploymentId) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
        env: {
          ...process.env,
          DOCKER_BUILDKIT: "1",
          COMPOSE_DOCKER_CLI_BUILD: "1",
        },
      });
      let output = "";

      const stream = (data) => {
        const text = data.toString();

        output += text;

        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          const text = line.trim();

          if (!text) continue;

          if (text.startsWith("=>")) continue;
          const parsed = logParser.parse(text);

          if (parsed) {
            logger.deployment(deploymentId, parsed);
          }
        }
      };

      child.stdout.on("data", stream);

      child.stderr.on("data", stream);

      child.on("error", reject);

      child.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(output));
        }

        resolve(output);
      });
    });
  }
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
          return reject(new Error(output));
        }

        resolve(output);
      });
    });
  }
  async buildImage({
    imageName,
    dockerfile,
    context,
    buildContext,
    deploymentId,
  }) {
    logger.deployment(deploymentId, "🐳 Building Docker Image...");

    const logs = await this.execute(
      "docker",
      [
        "build",

        "--rm",

        "--pull=false",

        "--progress=plain",

        "--network=host",

        "--cache-from",
        imageName,

        "--build-arg",
        "BUILDKIT_INLINE_CACHE=1",

        "--build-arg",
        `BUILD_CONTEXT=${buildContext}`,

        "--label",
        "velocore.build=true",

        "-t",
        imageName,

        "-f",
        dockerfile,

        context,
      ],
      deploymentId,
    );

    return logs;
  }

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

    args.push("-p", `${hostPort}:${containerPort}`);

    for (const [key, value] of Object.entries(env || {})) {
      if (value === undefined || value === null || value === "") {
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

    logger.deployment(deploymentId, "🚀 Starting Container...");

    logger.deployment(
      deploymentId,

      `🌱 Injecting ${Object.keys(env || {}).length} environment variable(s).`,
    );

    return new Promise((resolve, reject) => {
      const process = spawn("docker", args);

      let output = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
        logger.deployment(deploymentId, data.toString().trim());
      });

      process.stderr.on("data", (data) => {
        logger.deployment(deploymentId, data.toString().trim());
      });

      process.on("close", async (code) => {
        if (code !== 0) {
          return reject(new Error("Failed to start container."));
        }
        const containerId = output.trim();

        resolve({
          containerId,
          containerName,
          imageName,
          hostPort,
          containerPort,
        });
      });
    });
  }

  async stopContainer(name) {
    return this.execute(
      "docker",

      ["stop", name],
    );
  }
  async imageExists(image) {
    try {
      await this.executeSilent(
        "docker",
        [
          "image",
          "inspect",
          image
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

      ["rm", "-f", name],
    );
  }

  async removeImage(image) {
    return this.execute(
      "docker",

      ["rmi", "-f", image],
    );
  }

  async createNetwork(network) {
    return this.execute(
      "docker",

      ["network", "create", network],
    );
  }

  async removeNetwork(network) {
    return this.execute(
      "docker",

      ["network", "rm", network],
    );
  }
  async listContainers() {
    const output = await this.executeSilent("docker", [
      "ps",
      "-q",
      "--filter",
      "label=velocore=true",
    ]);

    return output.trim().split("\n").filter(Boolean);
  }

  async inspectContainer(containerId) {
    const output = await this.executeSilent("docker", ["inspect", containerId]);

    return JSON.parse(output)[0];
  }
}

module.exports = new DockerService();
