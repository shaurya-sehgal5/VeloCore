const config = require("./env")
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: config.DATABASE.USER,
  host: config.DATABASE.HOST,
  database: config.DATABASE.NAME,
  password: config.DATABASE.PASSWORD,
  port: Number(config.DATABASE.PORT) || 5000
});


// Explicit event validation listeners to track the pool integrity
pool.on('connect', () => {
  console.log('');
});

pool.on('error', (err) => {
  console.error('❌ Critical Infrastructure Database Error Event:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exported to preserve native platform handling functions if required
};