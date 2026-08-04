const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const metrics = require("../services/monitoring/metrics.service");
const deploymentOrchestrator = require("../services/deployment/deployment.orchestrator");
const config = require("../config/env")
const platformRollback = require("../services/deployment/platform-rollback.service");

const redisConnection = new IORedis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null,
});
const buildQueue = new Queue("production-build-queue", {
  connection: redisConnection,
});
setInterval(async () => {
  metrics.queueWaiting.set(await buildQueue.getWaitingCount());
  metrics.queueActive.set(await buildQueue.getActiveCount());
  metrics.queueDelayed.set(await buildQueue.getDelayedCount());
}, 5000);

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
    metrics.queueJobs
      .labels("started")
      .inc();
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
  metrics.queueJobs
    .labels("completed")
    .inc();
});

buildWorker.on("failed", async (job, err) => {
  console.error(
    `❌ Job ${job?.id} failed`,
    err.message,
  );

  metrics.queueJobs.labels("failed").inc();

  try {
    await platformRollback.rollback(
      job.data.deploymentId
    );
  } catch (rollbackError) {
    console.error(
      "Automatic rollback failed:",
      rollbackError.message
    );
  }
});

module.exports = {
  buildQueue,
};
