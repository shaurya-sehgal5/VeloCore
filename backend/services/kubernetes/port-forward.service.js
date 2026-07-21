const { spawn } = require("child_process");
const portService = require("../docker/port.service");

class PortForwardService {
  constructor() {
    this.processes = new Map();
  }

  async start(serviceName, namespace, targetPort) {
    // Reuse existing port-forward if already running
    if (this.processes.has(serviceName)) {
      return this.processes.get(serviceName).port;
    }

    const localPort = await portService.allocate();

    return new Promise((resolve, reject) => {
      const child = spawn(
        "kubectl",
        [
          "port-forward",
          `service/${serviceName}`,
          `${localPort}:${targetPort}`,
          "-n",
          namespace,
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          child.kill();

          reject(
            new Error(
              `Timed out starting port-forward for ${serviceName}`
            )
          );
        }
      }, 10000);

      child.stdout.on("data", (data) => {
        const text = data.toString();

        console.log(`[PORT-FORWARD] ${text.trim()}`);

        if (!resolved && text.includes("Forwarding from")) {
          resolved = true;

          clearTimeout(timeout);

          this.processes.set(serviceName, {
            process: child,
            port: localPort,
          });

          resolve(localPort);
        }
      });

      child.stderr.on("data", (data) => {
        console.error(`[PORT-FORWARD] ${data.toString().trim()}`);
      });

      child.on("error", (err) => {
        clearTimeout(timeout);

        if (!resolved) {
          reject(err);
        }
      });

      child.on("exit", (code) => {
        console.log(
          `[PORT-FORWARD] ${serviceName} stopped (code ${code})`
        );

        this.processes.delete(serviceName);
      });
    });
  }

  stop(serviceName) {
    const runtime = this.processes.get(serviceName);

    if (!runtime) {
      return;
    }

    runtime.process.kill("SIGTERM");

    this.processes.delete(serviceName);
  }

  stopAll() {
    for (const [serviceName, runtime] of this.processes.entries()) {
      runtime.process.kill("SIGTERM");
    }

    this.processes.clear();
  }

  getPort(serviceName) {
    const runtime = this.processes.get(serviceName);

    return runtime ? runtime.port : null;
  }

  isRunning(serviceName) {
    return this.processes.has(serviceName);
  }
}

module.exports = new PortForwardService();