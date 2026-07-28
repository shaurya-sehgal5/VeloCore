require("dotenv").config();

module.exports = {
  // Server
  PORT: process.env.PORT || 8080,

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Public URL of VeloCore backend
  PUBLIC_URL: process.env.PUBLIC_URL,

  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,

  // Database
  DATABASE: {
    HOST: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    NAME: process.env.DB_NAME,
  },

  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,

  // Security
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

  // Runtime
  RUNTIME_ENGINE: process.env.RUNTIME_ENGINE || "kubernetes",

  K8S_STORAGE_CLASS: process.env.K8S_STORAGE_CLASS || "local-path",

  BLOCK_ON_SECRETS: process.env.BLOCK_ON_SECRETS === "true",
  BLOCK_ON_CRITICAL: process.env.BLOCK_ON_CRITICAL === "true",

  // Monitoring
  LOKI_URL: process.env.LOKI_URL || "http://localhost:3100",
};