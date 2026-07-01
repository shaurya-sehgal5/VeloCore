const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class BuildService {
  /**
   * Securely clones the targeted repository, wiping any hanging folders out first
   */
  async cloneRepository(cloneUrl, githubToken, deploymentId) {
    const workspaceDir = path.join(__dirname, '../outputs', deploymentId);
    
    // Safety wipe: prevents Git Exit Code 128 crashes if a directory already exists
    if (fs.existsSync(workspaceDir)) {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }

    fs.mkdirSync(workspaceDir, { recursive: true });

    if (!cloneUrl.startsWith('https://github.com/')) {
      throw new Error('Security Violation: Invalid upstream provider target root.');
    }

    const authenticatedUrl = cloneUrl.replace('https://', `https://${githubToken}@`);
    console.log(`🛡️ [Build Engine]: Initiating secured git source clone for: ${deploymentId}`);

    return new Promise((resolve, reject) => {
      const gitProcess = spawn('git', ['clone', '--depth', '1', authenticatedUrl, workspaceDir], {
        timeout: 60000 
      });

      gitProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ [Build Engine]: Repository files cached locally.`);
          resolve(workspaceDir);
        } else {
          if (fs.existsSync(workspaceDir)) fs.rmSync(workspaceDir, { recursive: true, force: true });
          reject(new Error(`Git clone routine failed with exit code: ${code}`));
        }
      });

      gitProcess.on('error', (err) => {
        if (fs.existsSync(workspaceDir)) fs.rmSync(workspaceDir, { recursive: true, force: true });
        reject(err);
      });
    });
  }

  /**
   * 🐳 BULLETPROOF ISOLATED RUNNER:
   * Copies repository code directly inside the running container to bypass all Windows path bottlenecks.
   */
  async compileProject(workspaceDir, deploymentId) {
    const { getIO } = require('../config/socket');

    return new Promise((resolve, reject) => {
      console.log(`🐳 [Orchestrator]: Spawning isolated container lifecycle for: ${deploymentId}`);
      const io = getIO();
      const containerName = `builder-${deploymentId}`;

      // Step 1: Provision the container block securely with explicit memory caps
      const createProcess = spawn('docker', [
        'create',
        '--name', containerName,
        '--memory=3g',
        'velocore-builder:latest'
      ]);

      createProcess.on('close', (createCode) => {
        if (createCode !== 0) return reject(new Error('Failed to provision isolated sandbox container.'));

        console.log(`📦 [Orchestrator]: Container core allocated. Injecting repository blueprints...`);
        const standardizedPath = workspaceDir.replace(/\\/g, '/');

        // Step 2: Inject local workspace contents directly into the internal container layer
        const cpProcess = spawn('docker', ['cp', `${standardizedPath}/.`, `${containerName}:/app`]);

        cpProcess.on('close', (cpCode) => {
          if (cpCode !== 0) {
            spawn('docker', ['rm', '-f', containerName]);
            return reject(new Error('Failed to inject source assets into sandbox filesystem.'));
          }

          console.log(`🏃‍♂️ [Orchestrator]: Booting up isolated compiler sandbox thread...`);

          // Step 3: Start the container and intercept stdout/stderr to stream them live over WebSockets
          const startProcess = spawn('docker', ['start', '-a', containerName], { timeout: 300000 });

          const broadcastLogLine = (data, logType) => {
            const rawString = data.toString().trim();
            if (!rawString) return;

            const lines = rawString.split('\n');
            lines.forEach(line => {
              const formattedLine = line.trim();
              console.log(`🐳 [Docker Container Log]: ${formattedLine}`);
console.log("========== EMITTING LOG ==========");
console.log(deploymentId);
console.log(formattedLine);
console.log("==================================");
              // Emit line-by-line real-time data to our WebSocket dashboard room channel
              io.to(deploymentId).emit('build-log-stream', {
                text: formattedLine,
                timestamp: new Date().toISOString(),
                type: logType
              });
            });
          };

          startProcess.stdout.on('data', (data) => broadcastLogLine(data, 'info'));
          startProcess.stderr.on('data', (data) => broadcastLogLine(data, 'err'));

          startProcess.on('close', (startCode) => {
            if (startCode === 0) {
              console.log(`✅ [Orchestrator]: Sandbox build completed cleanly. Syncing static assets back down to host...`);
              
              const expectedDistPath = path.join(workspaceDir, 'dist');
              if (!fs.existsSync(expectedDistPath)) fs.mkdirSync(expectedDistPath, { recursive: true });

              // Step 4: Extract finalized production build distribution chunks back to the Windows drive safely
              const extractProcess = spawn('docker', ['cp', `${containerName}:/app/dist/.`, expectedDistPath]);

              extractProcess.on('close', () => {
                // Step 5: Wipe the temporary container container out completely
                spawn('docker', ['rm', '-f', containerName]);
                io.to(deploymentId).emit('build-status-update', { status: 'Success' });
                resolve(expectedDistPath);
              });
            } else {
              spawn('docker', ['rm', '-f', containerName]);
              io.to(deploymentId).emit('build-status-update', { status: 'Failed', error: 'Compilation script failed inside container.' });
              reject(new Error(`Docker sandbox execution crashed with exit code: ${startCode}`));
            }
          });
        });
      });
    });
  }
}

module.exports = new BuildService();