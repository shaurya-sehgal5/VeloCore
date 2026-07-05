const fs = require('fs');
const path = require('path');

function scanRepository(dirPath, foundApps = []) {
  const items = fs.readdirSync(dirPath);

  // First check if this specific folder is a functional project app root
  if (items.includes('package.json')) {
    try {
      const packageContent = JSON.parse(fs.readFileSync(path.join(dirPath, 'package.json'), 'utf8'));
      const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };

      // Make sure it's not JUST a structural root monorepo config file
      // A valid frontend or backend will usually have functional dependencies or scripts
      let appType = null;
      if (dependencies['react'] || dependencies['vite'] || dependencies['next'] || dependencies['vue']) {
        appType = 'static-frontend';
      } else if (dependencies['express'] || dependencies['nodemon'] || packageContent.scripts?.start || items.includes('server.js')) {
        appType = 'node-backend';
      }

      // If we classified a specific sub-app framework type, save it!
      if (appType) {
        foundApps.push({
          absolutePath: dirPath,
          appType
        });
      }
    } catch (e) {
      console.error(`Malformed package.json at ${dirPath}`);
    }
  }

  // Now scan subdirectories recursively to check for hidden nested sub-apps (like /frontend and /backend)
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    
    if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') {
      continue;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      scanRepository(fullPath, foundApps);
    }
  }

  return foundApps;
}

module.exports = { scanRepository };