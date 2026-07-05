# --- Stage 1: Prune and Install ---
FROM node:18-alpine AS backend-installer

ARG BUILD_CONTEXT=.
WORKDIR /app

COPY ${BUILD_CONTEXT}/package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm install --production --prefer-offline --no-audit

COPY ${BUILD_CONTEXT}/ ./

# --- Stage 2: Clean Runtime Execution ---
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

# Snatch only production modules and source items
COPY --from=backend-installer /app ./

EXPOSE 8080
CMD ["node", "server.js"]