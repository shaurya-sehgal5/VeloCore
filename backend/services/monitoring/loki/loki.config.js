module.exports = {
  url: process.env.LOKI_URL || "http://localhost:3100",

  labels: {
    app: "velocore",
    component: "backend",
    environment: process.env.NODE_ENV || "development",
  },
};