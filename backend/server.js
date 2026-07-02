const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { register } = require('./services/metrics.service');
const { processOneClickDeployment } = require('./services/deploy.service');
const projectRoutes = require('./routes/project.routes');
const authRoutes = require('./routes/auth.routes'); 
const { initSocket } = require('./config/socket');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const { startMonitoringService } = require('./services/monitor.service');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets 
initSocket(server);

// --- 1. GLOBAL MIDDLEWARES ---
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

// --- 2. 📊 METRICS ROUTE ---
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).send({ error: "Metrics generation failed: " + err.message });
  }
});

// --- 3. PRODUCTION AUTOMATION PIPELINES ---
app.post('/api/deploy/one-click', async (req, res) => {
  try {
    const result = await processOneClickDeployment(process.cwd(), Date.now());
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- 4. CORE APPLICATION MODULES & ROUTE MOUNTING ---
app.use('/api/auth', authRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- 5. ⚠️ CATCH-ALL 404 HANDLER (Must be at the absolute bottom) ---
app.use((req, res) => {
  console.log(`⚠️ [Server 404 Alert]: Unmapped request path: ${req.method} ${req.url}`);
  res.status(404).json({ error: `The endpoint path ${req.url} does not exist.` });
});

// --- 6. SERVER START ---
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 VeloCore Control Plane running smoothly on unified port ${PORT}`);
  startMonitoringService();
});