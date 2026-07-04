const path = require('path');
const fs = require('fs-extra');
const { compileProject } = require('./build.service'); 

/**
 * 🛠️ PROCESS ONE-CLICK DEPLOYMENT WORKSPACE
 * Sets up the workspace directory structure and triggers the build.
 */
exports.processOneClickDeployment = async (deploymentId, projectSourceDir, envVars = {}) => {
  // Define temporary workspace location inside your project backend root
  const workspaceDir = path.join(__dirname, 'workspaces', deploymentId);
  const targetNodeModules = path.join(workspaceDir, 'node_modules');

  try {
    console.log(`📦 [Deployment Handler]: Initializing workspace environment for ID: ${deploymentId}`);
    
    // Ensure clean workspace directory
    await fs.ensureDir(workspaceDir);
    
    // Copy template/cloned source code into the fresh workspace
    await fs.copy(projectSourceDir, workspaceDir, {
      filter: (src) => !src.includes('node_modules') && !src.includes('.git')
    });

    const packageJsonPath = path.join(workspaceDir, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      throw new Error("No package.json found in the project source metadata structure.");
    }

    // Ensure the target node_modules container directory exists cleanly
    await fs.ensureDir(targetNodeModules);

    console.log(`🚀 [Deployment Handler]: Workspace staged successfully. Handoff to compiler layer...`);
    
    // Pass execution off directly to our build compiler pipeline
    // This runs completely asynchronously in the background
    compileProject(workspaceDir, deploymentId, envVars).catch(err => {
      console.error(`❌ [Background Compilation Unhandled Exception]:`, err);
    });

    return { success: true, workspaceDir, deploymentId };

  } catch (error) {
    console.error(`❌ [Deployment Handler Failure]: Critical crash staging workspace:`, error);
    throw error;
  }
};