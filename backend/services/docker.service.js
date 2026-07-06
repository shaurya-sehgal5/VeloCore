const { spawn } = require("child_process");
const logger = require("./logger.service");

class DockerService {
  execute(command, args, deploymentId) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
      });

      let output = "";

      const stream = (data) => {
        const text = data.toString();

        output += text;

        text.split(/\r?\n/).forEach((line) => {
          if (line.trim().length > 0) {
            logger.deployment(deploymentId, line);
          }
        });
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

  async buildImage({
    imageName,

    dockerfile,

    context,

    buildContext,

    io,

    deploymentId,
  }) {
    logger.deployment(deploymentId, "🐳 Building Docker Image...");

    const logs = await this.execute(
      "docker",
      [
        "build",
        "-t",
        imageName,
        "--progress=plain",
        "--build-arg",
        `BUILD_CONTEXT=${buildContext}`,
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
    env = {},
    network,
    deploymentId,
  }) {
    const args = ["run", "-d", "--name", containerName];

    if (network) {
      args.push("--network", network);
    }

    args.push("-p", `${hostPort}:${containerPort}`);

    Object.entries(env).forEach(([key, value]) => {
      args.push("-e");
      args.push(`${key}=${value}`);
    });

    args.push(imageName);

    logger.deployment(deploymentId, "🚀 Starting Container...");

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

      process.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error("Failed to start container."));
        }

        resolve({
          containerId: output.trim(),
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
}

module.exports = new DockerService();
