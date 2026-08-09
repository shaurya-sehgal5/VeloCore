FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_BUILDKIT=1

RUN apk add --no-cache \
    docker-cli \
    docker-cli-buildx \
    bash \
    curl \
    git \
    openssh-client \
    ca-certificates \
    tzdata

RUN curl -fsSL https://dl.k8s.io/release/v1.36.1/bin/linux/amd64/kubectl \
    -o /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl

RUN curl -fsSL https://get.helm.sh/helm-v3.19.0-linux-amd64.tar.gz \
    | tar -xz && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    rm -rf linux-amd64

COPY package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

COPY . .

COPY <<'EOF' /usr/local/bin/velocore-start.sh
#!/bin/sh

set -e

VAULT_ENV="/vault/secrets/app.env"

if [ -f "$VAULT_ENV" ]; then
    echo "[VeloCore] Loading secrets from Vault..."

    set -a
    . "$VAULT_ENV"
    set +a

    echo "[VeloCore] Vault secrets loaded."
else
    echo "[VeloCore] No Vault secret file found. Starting with existing environment."
fi

exec npm start
EOF

RUN chmod +x /usr/local/bin/velocore-start.sh

EXPOSE 8080

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=5 \
    CMD node -e "require('http').get('http://127.0.0.1:8080/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["/usr/local/bin/velocore-start.sh"]