const { exec } = require("child_process");

class DockerMetricsService {
  async get(containerName) {
    return new Promise((resolve, reject) => {
      exec(
        `docker stats ${containerName} --no-stream --format "{{json .}}"`,
        (err, stdout) => {
          if (err) return reject(err);

          try {
            resolve(JSON.parse(stdout));
          } catch {
            reject(new Error("Failed to parse docker stats."));
          }
        },
      );
    });
  }
}

module.exports = new DockerMetricsService();