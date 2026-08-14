const { spawn } = require("child_process");
const logger = require("../monitoring/logger.service");

class KubectlService {

  execute(
    args,
    deploymentId = null,
    stage = "KUBECTL_STDOUT"
  ) {
    return new Promise((resolve, reject) => {
      const process = spawn(
        "kubectl",
        args,
        {
          windowsHide: true,
        }
      );

      let stdout = "";
      let stderr = "";

      const timeout = setTimeout(() => {
        process.kill("SIGTERM");

        reject(
          new Error(
            "kubectl command timed out after 120 seconds."
          )
        );
      }, 120000);

      process.stdout.on(
        "data",
        (data) => {
          stdout += data.toString();
        }
      );

      process.stderr.on(
        "data",
        (data) => {
          stderr += data.toString();
        }
      );

      process.on(
        "error",
        (err) => {
          clearTimeout(timeout);

          if (err.code === "ENOENT") {
            return reject(
              new Error(
                "kubectl is not installed inside the backend container."
              )
            );
          }

          reject(err);
        }
      );

      process.on(
        "close",
        (code) => {
          clearTimeout(timeout);

          if (code !== 0) {
            return reject(
              new Error(
                stderr.trim() ||
                stdout.trim() ||
                `kubectl exited with code ${code}`
              )
            );
          }

          resolve(stdout.trim());
        }
      );
    });
  }

  apply(
    file,
    deploymentId = null
  ) {
    return this.execute(
      [
        "apply",
        "--server-side",
        "-f",
        file,
      ],
      deploymentId
    );
  }

  delete(
    file,
    deploymentId = null
  ) {
    return this.execute(
      [
        "delete",
        "-f",
        file,
      ],
      deploymentId
    );
  }

  logs(
    pod,
    namespace = "default",
    follow = false,
    deploymentId = null
  ) {
    const args = [
      "logs",
      pod,
      "-n",
      namespace,
    ];

    if (follow) {
      args.push("-f");
    }

    return this.execute(
      args,
      deploymentId,
      "KUBECTL_STDOUT"
    );
  }

  describe(
    resource,
    name,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "describe",
        resource,
        name,
        "-n",
        namespace,
      ],
      deploymentId
    );
  }

  get(
    resource,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "get",
        resource,
        "-n",
        namespace,
        "-o",
        "json",
      ],
      deploymentId
    );
  }

  deleteResource(
    resource,
    name,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "delete",
        resource,
        name,
        "-n",
        namespace,
      ],
      deploymentId
    );
  }

  deletePod(
    name,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "delete",
        "pod",
        name,
        "-n",
        namespace,
      ],
      deploymentId
    );
  }

  async pods(deploymentId = null) {
    return this.execute(
      [
        "get",
        "pods",
        "-o",
        "json",
      ],
      deploymentId
    );
  }

  async rollout(
    name,
    namespace = "default",
    deploymentId = null
  ) {

    if (deploymentId) {
      await logger.info(
        deploymentId,
        "ROLLOUT",
        "Waiting for Kubernetes rollout..."
      );
    }

    const result =
      await this.execute(
        [
          "rollout",
          "status",
          `deployment/${name}`,
          "-n",
          namespace,
          "--timeout=60s",
        ],
        deploymentId,
        "KUBECTL_STDOUT"
      );

    if (deploymentId) {
      await logger.success(
        deploymentId,
        "ROLLOUT",
        "Deployment is available."
      );
    }

    return result;
  }

  restart(
    name,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "rollout",
        "restart",
        `deployment/${name}`,
        "-n",
        namespace,
      ],
      deploymentId
    );
  }

  deleteIngress(
    name,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "delete",
        "ingress",
        name,
        "-n",
        namespace,
      ],
      deploymentId
    );
  }

  scale(
    name,
    replicas,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "scale",
        `deployment/${name}`,
        `--replicas=${replicas}`,
        "-n",
        namespace,
      ],
      deploymentId
    );
  }

  async waitReady(
    name,
    namespace = "default",
    deploymentId = null
  ) {
    return this.execute(
      [
        "wait",
        "--for=condition=Ready",
        "pod",
        "-l",
        `app=${name}`,
        "-n",
        namespace,
        "--timeout=30s",
      ],
      deploymentId
    );
  }

  async getPod(
    name,
    namespace = "default",
    requireReady = true,
    deploymentId = null
  ) {
    const output =
      await this.execute(
        [
          "get",
          "pods",
          "-n",
          namespace,
          "-l",
          `app=${name}`,
          "-o",
          "json",
        ],
        deploymentId
      );

    const pods =
      JSON.parse(output).items;

    if (!pods.length) {
      return null;
    }

    return (
      pods.find((pod) => {

        if (
          pod.status.phase !==
          "Running"
        ) {
          return false;
        }

        if (!requireReady) {
          return true;
        }

        return pod.status.conditions?.some(
          (condition) =>
            condition.type === "Ready" &&
            condition.status === "True"
        );
      }) || null
    );
  }

  async deleteDeployment(
    name,
    namespace,
    deploymentId = null
  ) {
    return this.execute(
      [
        "delete",
        "deployment",
        name,
        "-n",
        namespace,
        "--ignore-not-found",
      ],
      deploymentId
    );
  }

  async deleteService(
    name,
    namespace,
    deploymentId = null
  ) {
    return this.execute(
      [
        "delete",
        "service",
        name,
        "-n",
        namespace,
        "--ignore-not-found",
      ],
      deploymentId
    );
  }

  async getService(
    name,
    namespace = "default",
    deploymentId = null
  ) {
    const output =
      await this.execute(
        [
          "get",
          "svc",
          name,
          "-n",
          namespace,
          "-o",
          "json",
        ],
        deploymentId
      );

    return JSON.parse(output);
  }

  streamLogs(
    pod,
    namespace = "default",
    deploymentId = null
  ) {

    const child = spawn(
      "kubectl",
      [
        "logs",
        "-f",
        pod,
        "-n",
        namespace,
      ]
    );

    if (deploymentId) {

      child.stdout.on(
        "data",
        (data) => {

          const lines =
            data
              .toString()
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);

          for (const line of lines) {
            logger.detail(
              deploymentId,
              "KUBECTL_STDOUT",
              "INFO",
              line
            );
          }
        }
      );

      child.stderr.on(
        "data",
        (data) => {

          const lines =
            data
              .toString()
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);

          for (const line of lines) {
            logger.detail(
              deploymentId,
              "KUBECTL_STDOUT",
              "ERROR",
              line
            );
          }
        }
      );
    }

    return child;
  }

  async waitDeletion(
    name,
    namespace = "default"
  ) {
    const timeout = 90000;
    const started = Date.now();

    while (
      Date.now() - started <
      timeout
    ) {
      try {

        await this.execute([
          "get",
          "deployment",
          name,
          "-n",
          namespace,
        ]);

        await new Promise(
          (resolve) =>
            setTimeout(resolve, 500)
        );

      } catch {
        return true;
      }
    }

    throw new Error(
      `Timed out waiting for deployment '${name}' to be deleted.`
    );
  }

  async deleteNamespace(namespace) {
    return this.execute([
      "delete",
      "namespace",
      namespace,
      "--ignore-not-found=true",
      "--wait=true",
    ]);
  }

  async getIngress(
    name,
    namespace,
    deploymentId = null
  ) {
    return this.execute(
      [
        "get",
        "ingress",
        name,
        "-n",
        namespace,
        "-o",
        "json",
      ],
      deploymentId
    );
  }

  async exists(
    resource,
    name,
    namespace = "default",
    deploymentId = null
  ) {
    try {

      await this.execute(
        [
          "get",
          resource,
          name,
          "-n",
          namespace,
        ],
        deploymentId
      );

      return true;

    } catch {
      return false;
    }
  }
}

module.exports =
  new KubectlService();