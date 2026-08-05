# Dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

# Runtime - APPLICATION ONLY!
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_BUILDKIT=1

# Install ONLY what your Node.js app needs at runtime
# These are the bare minimum for the application to run
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

EXPOSE 8080

HEALTHCHECK \
--interval=30s \
--timeout=5s \
--start-period=20s \
--retries=5 \
CMD node -e "require('http').get('http://127.0.0.1:8080/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]