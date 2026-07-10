const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");

const deploymentOrchestrator = require("../services/deployment/deployment.orchestrator");

const redisConnection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null
});

const buildQueue = new Queue(
    "production-build-queue",
    {
        connection: redisConnection
    }
);

const buildWorker = new Worker(

    "production-build-queue",

    async (job) => {

        const {

            deploymentId,

            cloneUrl,

            githubToken,

            io,

            env = {}

        } = job.data;

        console.log(
            `🚀 Processing Deployment ${deploymentId}`
        );

        return await deploymentOrchestrator.deploy({

            repoUrl: cloneUrl,

            githubToken,

            deploymentId,

            io,

            env

        });

    },

    {

        connection: redisConnection,

        concurrency: 1

    }

);

buildWorker.on("completed", job => {

    console.log(
        `✅ Job ${job.id} completed`
    );

});

buildWorker.on("failed", (job, err) => {

    console.error(

        `❌ Job ${job?.id} failed`,

        err.message

    );

});

module.exports = {

    buildQueue

};