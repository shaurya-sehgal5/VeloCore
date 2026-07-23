const { spawn } = require("child_process");

class KubectlService {
  execute(args) {
    return new Promise((resolve, reject) => {
      const process = spawn("kubectl", args, {
        windowsHide: true
      });

      let output = "";
      const timeout = setTimeout(() => {

        process.kill("SIGTERM");

      }, 120000);

      process.stdout.on("data", (d) => {
        output += d.toString();
      });

      process.stderr.on("data", (d) => {
        output += d.toString();
      });

      process.on("error", reject);

      process.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(output));
        }
clearTimeout(timeout);
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

  deleteDeployment(name, namespace = "default") {
    return this.execute(["delete", "deployment", name, "-n", namespace]);
  }

  deleteService(name, namespace = "default") {
    return this.execute(["delete", "service", name, "-n", namespace]);
  }
  async pods() {
    return this.execute(["get", "pods", "-o", "json"]);
  }

  rollout(name, namespace = "default") {
    return this.execute([
      "rollout",
      "status",
      `deployment/${name}`,
      "-n",
      namespace,
      "--timeout=60s",
    ]);
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

  rollback(name, namespace = "default") {
    return this.execute([
      "rollout",
      "undo",
      `deployment/${name}`,
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
  deleteNamespace(namespace) {
    return this.execute(["delete", "namespace", namespace]);
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
  async getPod(name, namespace = "default") {
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

    return pods.find(
      p => p.status.phase === "Running"
    ) || pods[0];
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
    while (true) {
      try {
        await this.execute([
          "get",
          "deployment",
          name,
          "-n",
          namespace,
        ]);
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        return;
      }
    }
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
