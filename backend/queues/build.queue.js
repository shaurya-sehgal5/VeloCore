const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const metrics = require("../services/monitoring/metrics.service");
const deploymentOrchestrator = require("../services/deployment/deployment.orchestrator");
const config = require("../config/env")

const redisConnection = new IORedis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
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
        () => reject(new Error("Deployment exceeded 5 minute timeout.")),
        300000
      )
    );
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
