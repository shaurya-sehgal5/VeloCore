#!/bin/sh

# Exit immediately if any compilation command fails
set -e

echo "🐳 [Container Sandbox]: Initialization sequence activated inside isolated Docker core..."

if [ ! -f package.json ]; then
  echo "❌ Error: package.json missing in repository root."
  exit 1
fi

echo "📦 [Container]: Installing dependencies via NPM..."
npm install

echo "🏃‍♂️ [Container]: Compiling static production bundle..."

# Check if it's a standard Vite project
if grep -q '"vite"' package.json || [ -f vite.config.js ] || [ -f vite.config.ts ]; then
  echo "⚡ [Vite Detected]: Injecting relative base path optimization (--base=./)..."
  npm run build -- --base=./ || npx vite build --base=./
else
  # Generic fallback for other frameworks (React-scripts, Vue, etc.)
  echo "🛠️ [Standard Node Detected]: Compiling default production target..."
  npm run build
fi

echo "✅ [Container]: Asset bundle successfully compiled."