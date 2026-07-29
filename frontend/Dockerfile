# Stage 1 - Build

FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_GITHUB_CLIENT_ID
ARG VITE_GRAFANA_URL

ENV \
    VITE_API_URL=${VITE_API_URL} \
    VITE_GITHUB_CLIENT_ID=${VITE_GITHUB_CLIENT_ID} \
    VITE_GRAFANA_URL=${VITE_GRAFANA_URL}

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


# Stage 2 - Runtime


FROM nginx:1.29-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK \
--interval=30s \
--timeout=5s \
--start-period=5s \
--retries=3 \
CMD wget --spider -q http://127.0.0.1 || exit 1

CMD ["nginx","-g","daemon off;"]