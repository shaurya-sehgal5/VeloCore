FROM node:22-alpine AS compiler

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci \
    --prefer-offline \
    --no-audit \
    --ignore-scripts

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=compiler /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx","-g","daemon off;"]