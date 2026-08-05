# Dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

# Runtime
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_BUILDKIT=1

# Install ONLY what's needed at runtime
RUN apk add --no-cache \
    git \
    openssh-client \
    docker-cli \
    docker-cli-buildx \
    bash \
    curl \
    ca-certificates \
    tzdata \
    gitleaks \
    trivy

# kubectl - needed for k8s operations
RUN curl -fsSL https://dl.k8s.io/release/v1.36.1/bin/linux/amd64/kubectl \
    -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl

# Helm 
RUN curl -fsSL https://get.helm.sh/helm-v3.19.0-linux-amd64.tar.gz \
    | tar -xz && \
    mv linux-amd64/helm /usr/local/bin && \
    rm -rf linux-amd64

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8080

HEALTHCHECK \
--interval=30s \
--timeout=5s \
--start-period=20s \
--retries=5 \
CMD node -e "require('http').get('http://127.0.0.1:8080/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]