const simpleGit = require('simple-git');
const fs = require('fs-extra'); 
const { execSync } = require('child_process');

/**
 * Optimized Service to orchestrate One-Click Git Pipelines 
 * and Local High-Speed Dependency Injection mirrors.
 */
async function processOneClickDeployment(projectPath, deploymentId) {
  const git = simpleGit(projectPath);
  const stagingDeployPath = path.join(projectPath, 'backend', 'outputs', `Deploy-${deploymentId}`);
  
  // 1. Optimized Git Staging Pipeline
  try {
    const status = await git.status();
    if (status.files.length > 0) {
      await git.add('.');
      await git.commit(`🔧 VeloCore Pipeline Engine Auto-Sync [Run ID: ${deploymentId}]`);
      await git.push('origin', 'main'); 
    }
  } catch (gitErr) {
    console.warn("⚠️ Git automation skipped or no upstream branch configured:", gitErr.message);
  }

  // 2. High-Speed Local NPM Caching Injection Mirror
  const sourcePkgJson = path.join(projectPath, 'package.json');
  const targetNodeModules = path.join(stagingDeployPath, 'node_modules');
  
  if (await fs.pathExists(sourcePkgJson)) {
    await fs.ensureDir(targetNodeModules);
    
    // Dynamically retrieve user environment system NPM cache configurations
    const globalNpmPath = execSync('npm root -g').toString().trim();
    const pkgData = await fs.readJson(sourcePkgJson);
    const dependencies = Object.keys(pkgData.dependencies || {});

    // Hardlink or copy modules instantly from local host environment instead of downloading again
    for (const pkg of dependencies) {
      const cacheSource = path.join(globalNpmPath, pkg);
      if (await fs.pathExists(cacheSource)) {
        await fs.copy(cacheSource, path.join(targetNodeModules, pkg), { overwrite: false });
      }
    }
  }
  
  // Return internal preview tracking pointers
  return {
    success: true,
    deploymentId,
    previewUrl: `http://localhost:8000/site/Deploy-${deploymentId}/index.html`,
    timestamp: new Date().toISOString()
  };
}

module.exports = { processOneClickDeployment };