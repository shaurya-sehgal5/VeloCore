const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const db = require('../config/db');

/**
 * 📁 CLONE REPOSITORY FROM GITHUB DYNAMICALLY
 * Provisions a secure temporary workspace and pulls code using the session token context.
 */
exports.cloneRepository = async (cloneUrl, githubToken, deploymentId) => {
  try {
    // Establish a unique local workspace path for the compilation isolation block
    const workspaceDir = path.join(process.cwd(), 'workspaces', deploymentId);
    await fs.ensureDir(workspaceDir);

    console.log(`📦 [Build Service]: Provisioning workspace directory: ${workspaceDir}`);

    // Inject the authenticated session token directly into the git runtime command anchor
    const authenticatedUrl = cloneUrl.replace('https://', `https://x-access-token:${githubToken}@`);
    
    console.log(`📡 [Build Service]: Initiating secure source code clone wrapper for ID: ${deploymentId}`);
    
    await new Promise((resolve, reject) => {
      exec(`git clone ${authenticatedUrl} ${workspaceDir}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ [Git Clone Process Fail]:`, stderr);
          return reject(new Error(`Failed to clone git repository repository context: ${error.message}`));
        }
        resolve();
      });
    });

    return workspaceDir;
  } catch (error) {
    // Instantly reflect tracking failure execution path straight down to the datastore
    await db.query(
      "UPDATE deployments SET status = 'FAILED', updated_at = NOW() WHERE id = $1",
      [deploymentId]
    );
    throw error;
  }
};

/**
 * 🚀 COMPILE PROJECT & MANAGE LOGS ASYNCHRONOUSLY
 * Executes the project build commands and updates the operational tracking states smoothly.
 */
exports.compileProject = async (workspaceDir, deploymentId, envVars = {}) => {
  console.log(`🛠️ [Build Service]: Launching asynchronous compiler pipelines inside: ${workspaceDir}`);

  // Update table status pipeline tracker straight into the database layer
  await db.query(
    "UPDATE deployments SET status = 'BUILDING', updated_at = NOW() WHERE id = $1",
    [deploymentId]
  );

  // Merge systemic runtime variable structures cleanly
  const mergedEnv = {
    ...process.env,
    ...envVars,
    DEPLOYMENT_ID: deploymentId,
    NODE_ENV: 'production'
  };

  // Determine standard execution targets based on dependency files available
  let command = 'npm';
  let args = ['install'];

  if (await fs.pathExists(path.join(workspaceDir, 'yarn.lock'))) {
    command = 'yarn';
    args = [];
  }

  // Spin up child execution processing layer block 
  const worker = spawn(command, args, {
    cwd: workspaceDir,
    env: mergedEnv,
    shell: true
  });

  worker.stdout.on('data', (data) => {
    console.log(`[Build Log - ${deploymentId}]: ${data.toString().trim()}`);
  });

  worker.stderr.on('data', (data) => {
    console.warn(`[Build Warning - ${deploymentId}]: ${data.toString().trim()}`);
  });

  worker.on('close', async (code) => {
    if (code !== 0) {
      console.error(`❌ [Compiler Pipeline Exception]: Build exited with anomaly failure code ${code}`);
      await db.query(
        "UPDATE deployments SET status = 'FAILED', updated_at = NOW() WHERE id = $1",
        [deploymentId]
      );
      return;
    }

    console.log(`✅ [Build Service]: Core installations finalized. Checking secondary build phases...`);
    
    // Check if an explicit build production script phase hook needs to run
    const packageJsonPath = path.join(workspaceDir, 'package.json');
    let hasBuildScript = false;

    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      if (pkg.scripts && pkg.scripts.build) {
        hasBuildScript = true;
      }
    }

    if (hasBuildScript) {
      console.log(`⚡ [Build Service]: Executing second production compile script sequence...`);
      const buildWorker = spawn(command, command === 'npm' ? ['run', 'build'] : ['build'], {
        cwd: workspaceDir,
        env: mergedEnv,
        shell: true
      });

      buildWorker.on('close', async (buildCode) => {
        if (buildCode !== 0) {
          await db.query("UPDATE deployments SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [deploymentId]);
        } else {
          await markDeploymentReady(deploymentId);
        }
      });
    } else {
      // If no build script exists, flag the architecture operational pipeline ready immediately
      await markDeploymentReady(deploymentId);
    }
  });
};

/**
 * 🔒 HELPER: FLIP STATUS STATE TO READY ON SUCCESS
 */
async function markDeploymentReady(deploymentId) {
  console.log(`🚀 [Build Service Sync]: Compilation success! Flipping deployment ID ${deploymentId} to READY status.`);
  await db.query(
    `UPDATE deployments 
     SET status = 'READY', 
         url = $1, 
         updated_at = NOW() 
     WHERE id = $2`,
    [`http://localhost:8000/${deploymentId}`, deploymentId]
  );
}