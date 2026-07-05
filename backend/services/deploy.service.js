const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { scanRepository } = require('./scanner.service');

async function processOneClickDeployment(gitRepoLocalPath, deploymentId, envVariables = {}, targetType = 'backend') {
  console.log(`📡 [Build Service]: Context safe deployment initialized.`);

  const detectedApps = scanRepository(gitRepoLocalPath);
  if (detectedApps.length === 0) {
    throw new Error("No deployment structures containing a valid package.json identified.");
  }

  const preferredType = targetType === 'frontend' ? 'static-frontend' : 'node-backend';
  const targetApp = detectedApps.find(app => app.appType === preferredType) || detectedApps[0];

  // Force forward slashes to ensure paths are Docker-friendly
  const buildContextPath = path.relative(gitRepoLocalPath, targetApp.absolutePath).replace(/\\/g, '/') || ".";
  const imageName = `velocore-app-${deploymentId}`;
  
  const dockerfilePath = targetApp.appType === 'static-frontend'
    ? path.resolve(__dirname, '../templates/Frontend.Dockerfile')
    : path.resolve(__dirname, '../templates/Backend.Dockerfile');

  let envFlagString = '';
  Object.entries(envVariables).forEach(([key, val]) => {
    envFlagString += ` -e ${key}="${val}"`;
  });

  const buildCommand = `docker build -t ${imageName} --build-arg BUILD_CONTEXT="${buildContextPath}" -f "${dockerfilePath}" "${gitRepoLocalPath}"`;

  console.log(`🐳 [Build Service]: Running container compilation safely via Build Engine.`);

  return new Promise((resolve, reject) => {
    exec(buildCommand, { env: { ...process.env, DOCKER_BUILDKIT: "1" } }, (buildError, stdout, stderr) => {
      if (buildError) {
        console.error(`❌ Docker Layer Crash Stack:`, stderr || stdout);
        return reject(new Error(`Docker compilation failure: ${stderr || buildError.message}`));
      }

      const hostPort = Math.floor(Math.random() * (10000 - 9000) + 9000);
      const internalPort = targetApp.appType === 'static-frontend' ? '80' : '8080';

      exec(`docker rm -f runtime-${deploymentId}`, () => {
        const runCommand = `docker run -d --name runtime-${deploymentId} -p ${hostPort}:${internalPort}${envFlagString} ${imageName}`;
        
        exec(runCommand, (runError) => {
          if (runError) return reject(new Error(`Runtime sandbox boot configuration drop: ${runError.message}`));
          
          resolve({
            success: true,
            url: `http://localhost:${hostPort}`,
            deploymentId
          });
        });
      });
    });
  });
}

module.exports = { processOneClickDeployment };