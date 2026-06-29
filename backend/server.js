const app = require('../backend/App');
require('dotenv').config();

const PORT = process.env.SERVER_PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 VeloCore Orchestration Engine running live on endpoint: http://localhost:${PORT}`);
});