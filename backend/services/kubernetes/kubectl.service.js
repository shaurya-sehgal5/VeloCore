const { spawn } = require("child_process");

class KubectlService {
  execute(args) {
    return new Promise((resolve, reject) => {
      const process = spawn("kubectl", args);

      let output = "";

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

        resolve(output);
      });
    });
  }

  apply(file) {
    return this.execute(["apply", "-f", file]);
  }

  delete(file) {
    return this.execute(["delete", "-f", file]);
  }

  logs(pod) {
    return this.execute(["logs", "-f", pod]);
  }

  async pods() {
    return this.execute(["get", "pods", "-o", "json"]);
  }

  rollout(name) {
    return this.execute(["rollout", "status", `deployment/${name}` ,  "--timeout=120s",]);
  }

  restart(name) {
    return this.execute(["rollout", "restart", `deployment/${name}`]);
  }

  rollback(name) {
    return this.execute(["rollout", "undo", `deployment/${name}`]);
  }

  scale(name, replicas) {
    return this.execute([
      "scale",
      `deployment/${name}`,
      `--replicas=${replicas}`,
    ]);
  }
  async getPod(name) {
    const output = await this.execute([
      "get",
      "pods",
      "-l",
      `app=${name}`,
      "-o",
      "json",
    ]);

    return JSON.parse(output).items[0];
  }

  async getService(name) {
    const output = await this.execute(["get", "svc", name, "-o", "json"]);

    return JSON.parse(output);
  }

  streamLogs(pod, namespace = "default") {
    return spawn("kubectl", ["logs", "-f", pod, "-n", namespace]);
  }
  async waitDeletion(name) {
    while (true) {
      try {
        await this.execute(["get", "deployment", name]);

        await new Promise((r) => setTimeout(r, 1000));
      } catch {
        return;
      }
    }
  }
}

module.exports = new KubectlService();
