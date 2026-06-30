const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class BuildService {
  /**
   * Clones a repository securely using isolated process spawn loops (Defends against Command Injection)
   */
  async cloneRepository(cloneUrl, githubToken, deploymentId) {
    const workspaceDir = path.join(__dirname, '../outputs', deploymentId);
    
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // Sanitize input to ensure the clone URL is a valid HTTPS string
    if (!cloneUrl.startsWith('https://github.com/')) {
      throw new Error('Security Violation: Invalid upstream provider target root.');
    }

    // Inject token cleanly
    const authenticatedUrl = cloneUrl.replace('https://', `https://${githubToken}@`);

    console.log(`🛡️ [Secured Build Engine]: Initiating isolated process spawn for: ${deploymentId}`);

    return new Promise((resolve, reject) => {
      // SECURE FIX: Using spawn instead of exec. 
      // Spawn passes arguments as an array directly to the system executable, 
      // making it impossible for hackers to append malicious shell commands (e.g., matching semi-colons).
      const gitProcess = spawn('git', [
        'clone', 
        '--depth', '1', 
        authenticatedUrl, 
        workspaceDir
      ], {
        timeout: 60000 // 60-Second Timeout limit: Prevents a massive repository from hanging and freezing our server threads permanently
      });

      gitProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ [Secured Build Engine]: Clone sequence finished cleanly.`);
          resolve(workspaceDir);
        } else {
          // Clean up directory instantly on failure to prevent storage leaks
          if (fs.existsSync(workspaceDir)) {
            fs.rmSync(workspaceDir, { recursive: true, force: true });
          }
          reject(new Error(`Git execution exited with failure code: ${code}`));
        }
      });

      gitProcess.on('error', (err) => {
        if (fs.existsSync(workspaceDir)) {
          fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
        reject(err);
      });
    });
  }
}

module.exports = new BuildService();