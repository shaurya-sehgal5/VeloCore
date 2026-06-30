const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const db = require('./cofig/db');

const app = express();

// Global Infrastructure Configuration Middleware Nodes
app.use(cors({ 
  origin: 'http://localhost:5173', 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser()); 
// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/project', projectRoutes);

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ system: 'VeloCore', status: 'Healthy' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;