# Dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

# Tools Stage - Install all CLI tools
FROM alpine:3.20 AS tools

RUN apk add --no-cache \
    curl \
    wget \
    unzip \
    tar \
    gzip \
    bash \
    ca-certificates

# Install kubectl
RUN curl -fsSL https://dl.k8s.io/release/v1.36.1/bin/linux/amd64/kubectl \
    -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl

# Install helm
RUN curl -fsSL https://get.helm.sh/helm-v3.19.0-linux-amd64.tar.gz \
    | tar -xz && \
    mv linux-amd64/helm /usr/local/bin && \
    rm -rf linux-amd64

# Install gitleaks
RUN GITLEAKS_VERSION=8.24.2 && \
    wget -qO- https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz \
    | tar -xz && \
    mv gitleaks /usr/local/bin && \
    chmod +x /usr/local/bin/gitleaks

# Install trivy
RUN TRIVY_VERSION=0.61.0 && \
    wget -qO- https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz \
    | tar -xz && \
    mv trivy /usr/local/bin && \
    chmod +x /usr/local/bin/trivy

# Runtime Stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_BUILDKIT=1

# Install Docker CLI and runtime dependencies
RUN apk add --no-cache \
    docker-cli \
    docker-cli-buildx \
    bash \
    curl \
    ca-certificates \
    tzdata

# Copy tools from tools stage
COPY --from=tools /usr/local/bin/kubectl /usr/local/bin/
COPY --from=tools /usr/local/bin/helm /usr/local/bin/
COPY --from=tools /usr/local/bin/gitleaks /usr/local/bin/
COPY --from=tools /usr/local/bin/trivy /usr/local/bin/

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