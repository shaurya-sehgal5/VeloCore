# =========================
# Stage 1 - Dependencies
# =========================
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

# =========================
# Stage 2 - Runtime
# =========================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_BUILDKIT=1
ENV COMPOSE_DOCKER_CLI_BUILD=1

RUN apk add --no-cache \
    bash \
    git \
    docker-cli \
    docker-cli-buildx \
    curl \
    wget \
    openssh-client \
    ca-certificates \
    tzdata \
    jq \
    unzip \
    tar \
    gzip \
    coreutils \
    findutils \
    grep \
    sed \
    util-linux

# kubectl
RUN curl -fsSL \
    -o /usr/local/bin/kubectl \
    https://dl.k8s.io/release/v1.36.1/bin/linux/amd64/kubectl \
 && chmod +x /usr/local/bin/kubectl

# gitleaks
RUN GITLEAKS_VERSION=8.24.2 && \
    wget -qO- https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz \
    | tar -xz && \
    mv gitleaks /usr/local/bin/ && \
    chmod +x /usr/local/bin/gitleaks

# helm 
RUN apk add --no-cache curl tar gzip && \
    curl -fsSL https://get.helm.sh/helm-v3.19.0-linux-amd64.tar.gz \
    | tar -xz && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    chmod +x /usr/local/bin/helm && \
    rm -rf linux-amd64

# loki
RUN curl -fsSL https://github.com/grafana/loki/releases/latest/download/logcli-linux-amd64.zip \
    -o /tmp/logcli.zip && \
    apk add --no-cache unzip && \
    unzip /tmp/logcli.zip -d /tmp && \
    mv /tmp/logcli-linux-amd64 /usr/local/bin/logcli && \
    chmod +x /usr/local/bin/logcli && \
    rm -rf /tmp/logcli*
    
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8080

CMD ["npm", "start"]