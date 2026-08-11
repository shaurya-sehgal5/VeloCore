const { spawn } = require("child_process");
const logger = require("../monitoring/logger.service");

class KubectlService {
  execute(args) {
    return new Promise((resolve, reject) => {
      const process = spawn("kubectl", args, {
        windowsHide: true
      });

      let output = "";
      const timeout = setTimeout(() => {

        process.kill("SIGTERM");

        reject(
          new Error("kubectl command timed out after 120 seconds.")
        );

      }, 120000);

      process.stdout.on("data", (d) => {
        output += d.toString();
      });

      process.stderr.on("data", (d) => {
        output += d.toString();
      });

      process.on("error", (err) => {
        if (err.code === "ENOENT") {
          return reject(
            new Error(
              "kubectl is not installed inside the backend container."
            )
          );
        }

        reject(err);
      });

      process.on("close", (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          return reject(new Error(output));
        }

        resolve(output);
      });
    });
  }

  apply(file) {
    return this.execute([
      "apply",
      "--server-side",
      "-f",
      file,
    ]);
  }

  delete(file) {
    return this.execute(["delete", "-f", file]);
  }

  logs(pod, namespace = "default", follow = false) {
    const args = ["logs", pod, "-n", namespace];

    if (follow) {
      args.push("-f");
    }

    return this.execute(args);
  }
  describe(resource, name, namespace = "default") {
    return this.execute(["describe", resource, name, "-n", namespace]);
  }

  get(resource, namespace = "default") {
    return this.execute(["get", resource, "-n", namespace, "-o", "json"]);
  }

  deleteResource(resource, name, namespace = "default") {
    return this.execute(["delete", resource, name, "-n", namespace]);
  }
  deletePod(name, namespace = "default") {
    return this.execute(["delete", "pod", name, "-n", namespace]);
  }


  async pods() {
    return this.execute(["get", "pods", "-o", "json"]);
  }

  async rollout(name, namespace = "default", deploymentId) {

    if (deploymentId) {

      await logger.info(
        deploymentId,
        "ROLLOUT",
        "Waiting for Kubernetes rollout..."
      );

    }

    const result = await this.execute([
      "rollout",
      "status",
      `deployment/${name}`,
      "-n",
      namespace,
      "--timeout=60s"
    ]);

    if (deploymentId) {

      await logger.success(
        deploymentId,
        "ROLLOUT",
        "Deployment is available."
      );

    }

    return result;

  }
  restart(name, namespace = "default") {
    return this.execute([
      "rollout",
      "restart",
      `deployment/${name}`,
      "-n",
      namespace,
    ]);
  }
  deleteIngress(name, namespace = "default") {
    return this.execute([
      "delete",
      "ingress",
      name,
      "-n",
      namespace,
    ]);
  }


  scale(name, replicas, namespace = "default") {
    return this.execute([
      "scale",
      `deployment/${name}`,
      `--replicas=${replicas}`,
      "-n",
      namespace,
    ]);
  }


  async waitReady(name, namespace = "default") {

    return this.execute([
      "wait",
      "--for=condition=Ready",
      "pod",
      "-l",
      `app=${name}`,
      "-n",
      namespace,
      "--timeout=30s"
    ]);
  }
  async getPod(name, namespace = "default", requireReady = true) {
    const output = await this.execute([
      "get",
      "pods",
      "-n",
      namespace,
      "-l",
      `app=${name}`,
      "-o",
      "json",
    ]);

    const pods = JSON.parse(output).items;

    if (!pods.length) {
      return null;
    }

    return (
      pods.find((pod) => {
        if (pod.status.phase !== "Running") {
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
  async deleteDeployment(name, namespace) {

    return this.execute([
      "delete",
      "deployment",
      name,
      "-n",
      namespace,
      "--ignore-not-found"
    ]);

  }
  async deleteService(name, namespace) {

    return this.execute([
      "delete",
      "service",
      name,
      "-n",
      namespace,
      "--ignore-not-found"
    ]);

  }
  async getService(name, namespace = "default") {
    const output = await this.execute([
      "get",
      "svc",
      name,
      "-n",
      namespace,
      "-o",
      "json",
    ]);

    return JSON.parse(output);
  }
  streamLogs(pod, namespace = "default") {
    return spawn("kubectl", ["logs", "-f", pod, "-n", namespace]);
  }
  async waitDeletion(name, namespace = "default") {
    const timeout = 90000;
    const started = Date.now();

    while (Date.now() - started < timeout) {
      try {
        await this.execute([
          "get",
          "deployment",
          name,
          "-n",
          namespace,
        ]);

        await new Promise((r) => setTimeout(r, 500));
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
  async getIngress(name, namespace) {

    return this.execute([
      "get",
      "ingress",
      name,
      "-n",
      namespace,
      "-o",
      "json"
    ]);

  }
  async exists(resource, name, namespace = "default") {
    try {
      await this.execute([
        "get",
        resource,
        name,
        "-n",
        namespace,
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new KubectlService();
