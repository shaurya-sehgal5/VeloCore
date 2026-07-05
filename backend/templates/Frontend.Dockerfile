# --- Stage 1: Isolated Compilation ---
FROM node:18-alpine AS compiler

ARG BUILD_CONTEXT=.
WORKDIR /app

# Copy dependency configs using the custom build context subpath
COPY ${BUILD_CONTEXT}/package*.json ./

# 🛡️ Disables automatic root hooks that leak to the host
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit --ignore-scripts

# Copy the actual nested source files to the current container WORKDIR (/app)
COPY ${BUILD_CONTEXT}/ ./

RUN ./node_modules/.bin/vite build

# --- Stage 2: Serve ---
FROM nginx:alpine
COPY --from=compiler /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]