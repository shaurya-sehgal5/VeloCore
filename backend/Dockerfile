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
ENV COMPOSE_DOCKER_CLI_BUILD=1

RUN apk add --no-cache \
    docker-cli \
    docker-cli-buildx \
    git \
    bash \
    curl \
    wget \
    jq \
    unzip \
    tar \
    gzip \
    openssh-client \
    ca-certificates \
    tzdata

# kubectl
RUN curl -fsSL https://dl.k8s.io/release/v1.36.1/bin/linux/amd64/kubectl \
-o /usr/local/bin/kubectl && \
chmod +x /usr/local/bin/kubectl

# Helm
RUN curl -fsSL https://get.helm.sh/helm-v3.19.0-linux-amd64.tar.gz \
| tar -xz && \
mv linux-amd64/helm /usr/local/bin && \
rm -rf linux-amd64

# Gitleaks
RUN GITLEAKS_VERSION=8.24.2 && \
wget -qO- https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz \
| tar -xz && \
mv gitleaks /usr/local/bin && \
chmod +x /usr/local/bin/gitleaks

# LogCLI
RUN wget -qO /tmp/logcli.zip \
https://github.com/grafana/loki/releases/latest/download/logcli-linux-amd64.zip && \
unzip /tmp/logcli.zip -d /tmp && \
mv /tmp/logcli-linux-amd64 /usr/local/bin/logcli && \
chmod +x /usr/local/bin/logcli && \
rm -rf /tmp/*

COPY --from=deps /app/node_modules ./node_modules

COPY . .

EXPOSE 8080

HEALTHCHECK \
--interval=30s \
--timeout=5s \
--start-period=20s \
--retries=5 \
CMD node -e "require('http').get('http://127.0.0.1:8080/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm","start"]