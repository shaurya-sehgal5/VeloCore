FROM node:22-alpine AS backend-installer

ARG BUILD_CONTEXT=.

WORKDIR /app

COPY ${BUILD_CONTEXT}/package*.json ./

RUN --mount=type=cache,target=/root/.npm \
npm ci \
--omit=dev \
--prefer-offline \
--no-audit

COPY ${BUILD_CONTEXT}/ .

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=backend-installer /app .

EXPOSE 8080

CMD ["npm","start"]