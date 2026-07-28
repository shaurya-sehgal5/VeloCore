# ---------- Build ----------
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_GITHUB_CLIENT_ID
ARG VITE_GRAFANA_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
ENV VITE_GRAFANA_URL=$VITE_GRAFANA_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ---------- Runtime ----------
FROM nginx:1.29-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]