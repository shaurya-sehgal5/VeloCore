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

setInterval(async () => {
  const waiting = await buildQueue.getWaitingCount();

  metrics.queueJobs.set(waiting);
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

    console.log(`🚀 Processing Deployment ${deploymentId}`);

    metrics.deployments.inc();

    const timeout = new Promise((_, reject) =>
  setTimeout(
    () => reject(new Error("Build timed out after 10 minutes.")),
    10 * 60 * 1000
  )
);

let lastError;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    console.log(`🚀 Deployment Attempt ${attempt}/3`);

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

    if (attempt < 3) {
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
