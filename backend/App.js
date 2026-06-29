const express = require('express');
const cors = require('cors');
const authRoutes = require('../backend/routes/auth.routes');
const db = require('../backend/cofig/db');

const app = express();

// Global System Level Configuration Hooks
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Declarative Routing Modules Map Mounting points
app.use('/api/auth', authRoutes);

// Base health entry point check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ system: 'VeloCore', status: 'Healthy', database: 'Connected' });
  } catch (err) {
    res.status(500).json({ system: 'VeloCore', status: 'Degraded', error: err.message });
  }
});

module.exports = app;