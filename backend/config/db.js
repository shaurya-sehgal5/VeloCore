const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5000,
});

// Explicit event validation listeners to track the pool integrity
pool.on('connect', () => {
  console.log('✅ PostgreSQL Shared Infrastructure Connected Successfully.');
});

pool.on('error', (err) => {
  console.error('❌ Critical Infrastructure Database Error Event:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exported to preserve native platform handling functions if required
};