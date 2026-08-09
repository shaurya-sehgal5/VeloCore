const db = require("../config/db");
const { buildQueue } = require("../queues/build.queue");
const signatureService = require("../services/git/signature.service");
const { decrypt } = require("../utils/crypto");
const { v4: uuidv4 } = require("uuid");
const config = require("../config/env")

exports.receive = async (req, res) => {
  try {
    // 1. Fast-path exit for non-push webhooks (e.g., ping events)
    if (req.header("X-GitHub-Event") !== "push") {
      return res.sendStatus(200);
    }

    const signature = req.header("X-Hub-Signature-256");
    if (!signature) {
      return res.status(401).json({ error: "Missing cryptographic signature signature" });
    }

    // 2. Safely normalize raw vs. pre-parsed request bodies
    const rawPayload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const json = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

    const cloneUrl = json.repository?.clone_url;
    const branchName = json.ref?.replace("refs/heads/", "");

    if (!cloneUrl || !branchName) {
      return res.status(400).json({ error: "Malformed payload structure" });
    }

    /*
    ---------------------------------------------------------
    Step 1: Locate Target Multi-Tenant Project
    ---------------------------------------------------------
    */
    const { rows } = await db.query(
      `
      SELECT p.*, u.github_token
      FROM projects p
      JOIN users u ON u.id = p.user_id
      WHERE p.repo_url = $1
      ORDER BY p.id DESC LIMIT 1;
      `,
      [cloneUrl]
    );

    if (!rows.length) {
      console.log(`ℹ No project registered matching URL: ${cloneUrl}`);
      return res.sendStatus(200); // Return 200 so GitHub doesn't mark it as a webhook failure
    }

    const project = rows[0];

    /*
    ---------------------------------------------------------
    Step 2: Cryptographic Signature Verification (Fail Fast)
    ---------------------------------------------------------
    */
    const isVerified = signatureService.verify(
      project.webhook_secret,
      rawPayload,
      signature
    );

    if (!isVerified) {
      console.error(`❌ Security Warning: Invalid HMAC signature received for Project ID: ${project.id}`);
      return res.status(401).json({ error: "Invalid signature verification match" });
    }

    /*
    ---------------------------------------------------------
    Step 3: Branch Optimization Check
    ---------------------------------------------------------
    */

    const targetBranch = project.production_branch || "main";
    if (branchName !== targetBranch) {
      console.log(`ℹ Skinned deployment: Push to branch '${branchName}' does not match tracking target '${targetBranch}'.`);
      return res.sendStatus(200);
    }

    if (!project.auto_deploy) {
      console.log(`⚠ Auto Deploy Disabled for project: ${project.id}`);
      return res.sendStatus(200);
    }

    /*
    ---------------------------------------------------------
    Step 4: Atomic Queue Purge & Commit Update
    ---------------------------------------------------------
    */

    // await buildQueue.removeJobs(`project-${project.id}`);

    const githubToken = decrypt(project.github_token);
    const headCommit = json.head_commit || { message: "No commit message", author: { name: "Unknown" } };

    await db.query(
      `
      UPDATE projects
      SET last_commit_sha = $1, last_commit_message = $2, last_commit_author = $3
      WHERE id = $4
      `,
      [json.after, headCommit.message, headCommit.author.name, project.id]
    );

    /*
    ---------------------------------------------------------
    Step 5: Provision Deployment Record & Queue Background Worker
    ---------------------------------------------------------
    */
    const deploymentId = uuidv4();
    const io = req.app.get("io");

    if (io) {
      io.emit("deployment_created", {
        deploymentId,
        projectId: project.id,
        projectName: project.name,
        status: "QUEUED",
      });
    }
    const deploymentUrl = `${deploymentId.substring(0, 8)}.${config.APP_DOMAIN}`;

    await db.query(
      `
      INSERT INTO deployments (id, project_id, user_id, repo_name, repo_url, status, deploy_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'QUEUED', $6, NOW(), NOW())
      `,
      [deploymentId, project.id, project.user_id, project.name, project.repo_url, deploymentUrl]
    );

    await buildQueue.add(
      "deployment",
      {
        deploymentId,
        cloneUrl: project.repo_url,
        githubToken,
        targetBranch,
        env: project.environment_variables || {},
      },
      {
        jobId: deploymentId,
        removeOnComplete: 20,
        removeOnFail: 20,
      }
    );

    console.log(`🚀 Automated Continuous Deployment Pipeline Enqueued successfully for ID: ${deploymentId}`);
    return res.sendStatus(200);

  } catch (err) {
    console.error("Fatal exception encountered in webhook processor core:", err);
    return res.sendStatus(500);
  }
};