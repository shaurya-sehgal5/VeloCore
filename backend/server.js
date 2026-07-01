const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const projectRoutes = require('./routes/project.routes');
// 🌟 THE FIX: Import your authentication routes file here
const authRoutes = require('./routes/auth.routes'); 

const { initSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);

initSocket(server);

// Middleware Configuration
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

// 🌟 THE FIX: Mount your Auth routes onto the '/api/auth' base path prefix
app.use('/api/auth', authRoutes);

// Project management routes
app.use('/api/project', projectRoutes);

// Catch-all 404 handler for debugging routing errors
app.use((req, res) => {
  console.log(`⚠️ [Server 404 Alert]: Unmapped request path: ${req.method} ${req.url}`);
  res.status(404).json({ error: `The endpoint path ${req.url} does not exist.` });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 ==================================================`);
  console.log(`🚀 VeloCore Control Plane running smoothly on port ${PORT}`);
  console.log(`🚀 ==================================================`);
});