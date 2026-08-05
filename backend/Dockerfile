FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_BUILDKIT=1

# Install all dependencies and tools
RUN apk add --no-cache \
    docker-cli \
    docker-cli-buildx \
    bash \
    curl \
    wget \
    ca-certificates \
    tzdata \
    && \
    # kubectl
    curl -fsSL https://dl.k8s.io/release/v1.36.1/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \
    # helm
    curl -fsSL https://get.helm.sh/helm-v3.19.0-linux-amd64.tar.gz | tar -xz && \
    mv linux-amd64/helm /usr/local/bin && \
    rm -rf linux-amd64 && \
    # gitleaks
    wget -qO- https://github.com/gitleaks/gitleaks/releases/download/v8.24.2/gitleaks_8.24.2_linux_x64.tar.gz | tar -xz && \
    mv gitleaks /usr/local/bin && \
    chmod +x /usr/local/bin/gitleaks && \
    # trivy - Try with community repo
    echo "http://dl-cdn.alpinelinux.org/alpine/v3.20/community" >> /etc/apk/repositories && \
    apk update && \
    apk add --no-cache trivy

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application
COPY . .

EXPOSE 8080

HEALTHCHECK \
--interval=30s \
--timeout=5s \
--start-period=20s \
--retries=5 \
CMD node -e "require('http').get('http://127.0.0.1:8080/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]