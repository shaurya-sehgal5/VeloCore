#!/bin/sh
echo "🐳 [Container Sandbox]: Initialization sequence activated inside isolated Docker core..."

# Fallback to current directory if not specified
cd /app

# 1. Framework & Dependency Node Mapping Matrix
if [ -f "package.json" ]; then
    echo "📦 [Container]: JavaScript/Node.js architecture blueprint identified."
    
    if [ -f "yarn.lock" ]; then
        echo "🏃‍♂️ [Container]: Executing Yarn compilation..."
        yarn install && yarn build
    elif [ -f "pnpm-lock.yaml" ]; then
        echo "🏃‍♂️ [Container]: Executing PNPM compilation..."
        npx pnpm install && npx pnpm build
    else
        echo "🏃‍♂️ [Container]: Executing standard NPM compilation..."
        npm install && npm run build
    fi
else
    echo "❌ [Container Fault]: Unrecognized project stack blueprint matrix."
    exit 1
fi

echo "✅ [Container Sandbox]: Target asset compilation finalized cleanly."