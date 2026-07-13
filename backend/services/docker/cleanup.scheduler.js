const dockerService = require("./docker.service");

class CleanupScheduler {
  start() {
    console.log("🧹 Docker Cleanup Scheduler Started");

    setInterval(async () => {
      try {
        console.log("🧹 Cleaning Docker...");

        await dockerService.executeSilent("docker", [
          "container",
          "prune",
          "-f",
        ]);

        await dockerService.executeSilent("docker", [
          "image",
          "prune",
          "-f",
        ]);

        await dockerService.executeSilent("docker", [
          "network",
          "prune",
          "-f",
        ]);

        await dockerService.executeSilent("docker", [
          "builder",
          "prune",
          "-f",
        ]);

        console.log("✅ Docker Cleanup Finished");
      } catch (err) {
        console.error("Cleanup Error:", err.message);
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

module.exports = new CleanupScheduler();