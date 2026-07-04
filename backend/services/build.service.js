const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const simpleGit = require('simple-git');
const db = require('../config/db'); // Adjust this to point directly to your database setup module

/**
 * 📥 CLONE REPOSITORY INTO WORKSPACE
 * Automatically pulls the user's project down to the target staging path
 */
/**
 * 📥 CLONE REPOSITORY INTO WORKSPACE WITH AUTH
 * Automatically pulls the user's project down using their active GitHub token session
 */
exports.cloneRepository = async (repoUrl, githubToken, workspaceDir) => {
  console.log(`📡 [Build Service]: Initiating secure repository sync to: ${workspaceDir}`);
  try {
    await fs.ensureDir(workspaceDir);
    
    // Inject token for seamless authenticated cloning (Handles private repositories securely)
    let authenticatedUrl = repoUrl;
    if (githubToken && repoUrl.startsWith('https://github.com/')) {
      authenticatedUrl = repoUrl.replace('https://github.com/', `https://x-token-auth:${githubToken}@github.com/`);
    }

    const git = simpleGit();
    
    // Clones the repository cleanly into the workspace folder path
    await git.clone(authenticatedUrl, workspaceDir, ['--depth=1']); 
    console.log(`✅ [Build Service]: Repository successfully cloned.`);
    return workspaceDir;
  } catch (error) {
    console.error(`❌ [Build Service Git Error]: Failed cloning repository:`, error);
    throw error;
  }
};

/**
 * 🏁 MARK DEPLOYMENT AS READY
 */
const markDeploymentReady = async (deploymentId) => {
  console.log(`🎉 [Build Service]: Deployment pipeline completed flawlessly for ID: ${deploymentId}`);
  await db.query(
    "UPDATE deployments SET status = 'READY', updated_at = NOW() WHERE id = $1",
    [deploymentId]
  );
};

/**
 * 🚀 COMPILE PROJECT & MANAGE LOGS ASYNCHRONOUSLY
 */
// 💡 Add 'io' as the first parameter here
exports.compileProject = async (io, workspaceDir, deploymentId, envVars = {}) => {
  console.log(`🛠️ [Build Service]: Launching compiler pipelines inside: ${workspaceDir}`);

  // Notify frontend that build status changed
  io.to(deploymentId).emit('status_update', { status: 'BUILDING' });

  await db.query(
    "UPDATE deployments SET status = 'BUILDING', updated_at = NOW() WHERE id = $1",
    [deploymentId]
  );

  const mergedEnv = {
    ...process.env,
    ...envVars,
    DEPLOYMENT_ID: deploymentId,
    NODE_ENV: 'development', 
    CI: 'true' 
  };

  let command = 'npm';
  let args = ['install', '--include=dev', '--prefer-offline', '--no-audit', '--no-fund'];

  if (await fs.pathExists(path.join(workspaceDir, 'yarn.lock'))) {
    command = 'yarn';
    args = ['install', '--prefer-offline'];
  }

  const worker = spawn(command, args, { cwd: workspaceDir, env: mergedEnv, shell: true });

 // --- Standard npm / yarn install data stream parsing ---
  worker.stdout.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`[Build Log - ${deploymentId}]: ${trimmed}`);
        io.to(deploymentId).emit('live_logs', trimmed); 
      }
    });
  });

  worker.stderr.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        console.warn(`[Build Warning - ${deploymentId}]: ${trimmed}`);
        io.to(deploymentId).emit('live_logs', trimmed);
      }
    });
  });

  worker.on('close', async (code) => {
    if (code !== 0) {
      io.to(deploymentId).emit('status_update', { status: 'FAILED' });
      await db.query("UPDATE deployments SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [deploymentId]);
      return;
    }

    console.log(`✅ [Build Service]: Core dependencies fully resolved. Moving to compilation...`);
    io.to(deploymentId).emit('live_logs', '✅ Core dependencies fully resolved. Starting Vite compilation...');
    
    const packageJsonPath = path.join(workspaceDir, 'package.json');
    let hasBuildScript = false;

    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      if (pkg.scripts && pkg.scripts.build) hasBuildScript = true;
    }

    if (hasBuildScript) {
      const buildWorker = spawn(command === 'npm' ? 'npx.cmd' : 'yarn', command === 'npm' ? ['vite', 'build'] : ['build'], {
        cwd: workspaceDir,
        env: mergedEnv,
        shell: true
      });
// --- Vite build production compilation stream parsing ---
      buildWorker.stdout.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) {
            console.log(`[Production Build Log - ${deploymentId}]: ${trimmed}`);
            io.to(deploymentId).emit('live_logs', trimmed); 
          }
        });
      });

      buildWorker.stderr.on('data', (data) => {
        const lines = data.toString().split(/\r?\n/);
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) {
            console.error(`⚠️ [Production Build Error - ${deploymentId}]: ${trimmed}`);
            io.to(deploymentId).emit('live_logs', trimmed);
          }
        });
      });

      buildWorker.on('close', async (buildCode) => {
        if (buildCode !== 0) {
          io.to(deploymentId).emit('status_update', { status: 'FAILED' });
          await db.query("UPDATE deployments SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [deploymentId]);
        } else {
          io.to(deploymentId).emit('status_update', { status: 'READY' });
          io.to(deploymentId).emit('live_logs', '🎉 Deployment pipeline completed flawlessly!');
          await markDeploymentReady(deploymentId);
        }
      });
    } else {
      io.to(deploymentId).emit('status_update', { status: 'READY' });
      await markDeploymentReady(deploymentId);
    }
  });
};