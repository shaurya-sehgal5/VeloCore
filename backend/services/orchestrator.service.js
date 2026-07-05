const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { scanRepository } = require('./scanner.service');

/**
 * Triggers context-aware multi-stage builds by isolating the correct subfolder location.
 * @param {string} deploymentId - Unique deployment identification string
 * @param {string} gitRepoLocalPath - Absolute location path of cloned repository code
 * @param {object} envVariables - Object containing clean environment key-value configurations
 * @param {string} targetType - Explicit target category passed from client ('frontend' | 'backend')
 */
async function triggerOneClickDeployment(deploymentId, gitRepoLocalPath, envVariables = {}, targetType = 'backend') {
  console.log(`🚀 [Orchestrator]: Triggered context analysis on target: ${gitRepoLocalPath}`);
  
  // 1. Traverse repository folders recursively to locate execution engines
  const detectedApps = scanRepository(gitRepoLocalPath);
  
  if (detectedApps.length === 0) {
    throw new Error("No deployment structures containing a valid package.json ecosystem targets identified.");
  }

  // 2. Select matching directory target based on whether user requested a frontend or backend runtime
  const preferredAppType = targetType === 'frontend' ? 'static-frontend' : 'node-backend';
  
  const targetApp = detectedApps.find(app => app.appType === preferredAppType) || detectedApps[0]; 
  console.log(`🎯 [Orchestrator]: Match confirmed. Targeted routing context path: ${targetApp.absolutePath} (${targetApp.appType})`);

  // 3. Formulate the explicit relative path context variable for Docker processing hooks
  const buildContextPath = path.relative(gitRepoLocalPath, targetApp.absolutePath) || ".";
  
  const imageName = `velocore-app-${deploymentId}`;
  
  // Resolve paths straight to your templates directory layout securely
  const dockerfilePath = targetApp.appType === 'static-frontend' 
    ? path.join(__dirname, '../templates/Frontend.Dockerfile') 
    : path.join(__dirname, '../templates/Backend.Dockerfile');

  // Verify template file visibility layers to mitigate runtime pipeline drops
  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`Deployment Aborted: Missing infrastructure template component blueprint at: ${dockerfilePath}`);
  }

  // 4. Clean and compile user configuration parameters into string arguments safely
  let envFlagString = '';
  Object.entries(envVariables).forEach(([key, val]) => {
    envFlagString += ` -e ${key}="${val}"`;
  });

  // Enable BuildKit natively to support high-performance dependency tracking caches
  const buildCommand = `set DOCKER_BUILDKIT=1 && docker build -t ${imageName} --build-arg BUILD_CONTEXT="${buildContextPath}" -f "${dockerfilePath}" "${gitRepoLocalPath}"`;
  
  console.log(`🐳 [Docker Engine]: Running structural isolated build loop...`);

  // Execute build context compilation pipeline process
  exec(buildCommand, (buildError, stdout, stderr) => {
    if (buildError) {
      console.error(`❌ Build failed:`, stderr);
      throw new Error(`Docker context compilation failure: ${stderr || buildError.message}`);
    }

    const hostPort = Math.floor(Math.random() * (10000 - 9000) + 9000);
    const internalPort = targetApp.appType === 'static-frontend' ? '80' : '8080';

    // 5. Cleanup past container run instances safely to avoid duplicate name collisions
    exec(`docker rm -f runtime-${deploymentId}`, () => {
      
      // 6. Initialize fresh application container instance mapped to dynamic public target ports
      const runCommand = `docker run -d --name runtime-${deploymentId} -p ${hostPort}:${internalPort}${envFlagString} ${imageName}`;
      
      exec(runCommand, (runError) => {
        if (runError) {
          console.error(`❌ Runtime execution configuration drop:`, runError);
          return;
        }
        console.log(`🚀 [Sandbox Live]: Multi-folder repository online at address: http://localhost:${hostPort}`);
      });
    });
  });
}

module.exports = { triggerOneClickDeployment };