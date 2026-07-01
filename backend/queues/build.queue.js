const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const buildService = require('../services/build.service');

// Establish connection to your running Docker Redis broker
const redisConnection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null // Required by BullMQ architecture patterns
});

console.log('🎈 [Redis Bridge]: Connection pipeline linked safely to BullMQ infrastructure.');

// 1. Create the Queue conveyor belt instance
const buildQueue = new Queue('production-build-queue', { connection: redisConnection });

// 2. Create the Background Worker Processing Engine
const buildWorker = new Worker('production-build-queue', async (job) => {
  const { deploymentId, cloneUrl, githubToken } = job.data;
  
  console.log(`⚙️ [Worker Core]: Processing active job entry ticket: ${deploymentId}`);

  try {
    // Phase A: Securely clone code down, auto-wiping previous folder states safely
    const workspaceDir = await buildService.cloneRepository(cloneUrl, githubToken, deploymentId);

    // Phase B: Execute isolated Docker filesystem streaming build loops
    const finalizedDistPath = await buildService.compileProject(workspaceDir, deploymentId);

    console.log(`🎉 [Worker Core]: Job successfully completed for ID: ${deploymentId}`);
    return { success: true, path: finalizedDistPath };

  } catch (error) {
    console.error(`❌ [Worker Core Failure Exception] on Job ${job.id}:`, error.message);
    throw error;
  }
}, { 
  connection: redisConnection,
  concurrency: 1 // Processes 1 heavy compilation job at a time to keep host memory stable
});

buildWorker.on('failed', (job, err) => {
  console.error(`⚠️ [Worker Alert]: Job instance ${job?.id} has definitively failed: ${err.message}`);
});

module.exports = { buildQueue };