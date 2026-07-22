const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const metrics = require("../services/monitoring/metrics.service");
const deploymentOrchestrator = require("../services/deployment/deployment.orchestrator");

const redisConnection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

const buildQueue = new Queue("production-build-queue", {
  connection: redisConnection,
});

buildQueue.on("waiting", async () => {
  metrics.queueWaiting.set(
    await buildQueue.getWaitingCount()
  );
});

buildQueue.on("completed", async () => {
  metrics.queueActive.set(
    await buildQueue.getActiveCount()
  );
});

buildQueue.on("failed", async () => {
  metrics.queueDelayed.set(
    await buildQueue.getDelayedCount()
  );
});

const buildWorker = new Worker(
  "production-build-queue",

  async (job) => {
    const {
      deploymentId,
      cloneUrl,
      githubToken,
      io,
      env = {},
    } = job.data;

    console.log(`🚀 Processing Deployment ${deploymentId}`);

    metrics.deployments.inc({
      status: "STARTED",
      runtime: "kubernetes",
      framework: "unknown",
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Deployment exceeded 10 minute timeout.")),
        600000
      )
    );

    const MAX_RETRIES = 2;
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {

        return await Promise.race([
          deploymentOrchestrator.deploy({
            repoUrl: cloneUrl,
            githubToken,
            deploymentId,
            io,
            env,
          }),
          timeout,
        ]);
      } catch (err) {
        lastError = err;

        console.log(
          `❌ Attempt ${attempt} Failed: ${err.message}`
        );

        if (attempt < MAX_RETRIES) {
          console.log("🔄 Retrying in 5 seconds...");

          await new Promise((resolve) =>
            setTimeout(resolve, 5000)
          );
        }
      }
    }

    throw lastError;
  },

  {
    connection: redisConnection,

    concurrency: 1,
  },
);

buildWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

buildWorker.on("failed", (job, err) => {
  console.error(
    `❌ Job ${job?.id} failed`,

    err.message,
  );
});

module.exports = {
  buildQueue,
};
