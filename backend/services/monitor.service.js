const pool = require('../config/db');

/**
 * Samples and records the 10 core DevOps metrics for all active deployments.
 * Runs every 60 seconds to achieve optimized Free Tier storage costs.
 */
async function collectSystemMetrics() {
  try {
    // 1. Get all deployments that are currently active and live
    const activeDeployments = await pool.query(
      "SELECT id, project_id FROM deployments WHERE status = 'READY'"
    );

    if (activeDeployments.rows.length === 0) return;

    const timestamp = new Date();

    // 2. Loop through each live application to record its health slice
    for (const app of activeDeployments.rows) {
      
      // --- DEVOPS COLLECTION LOGIC (Under the hood values) ---
      // In production, these are pulled from process.cpuUsage(), OS variables, or your reverse proxy logs.
      // We generate realistic web service variables here for deployment simulation:
      
      const cpuUsage = parseFloat((Math.random() * 15 + 5).toFixed(2));        // 5% - 20% baseline
      const memoryUsage = parseFloat((Math.random() * 40 + 90).toFixed(2));    // 90MB - 130MB footprint
      const requestCount = Math.floor(Math.random() * 30 + 10);                // 10 - 40 Requests per second
      const errorRate = parseFloat((Math.random() * 0.8).toFixed(2));          // Low stable error %
      const latencyMs = Math.floor(Math.random() * 80 + 45);                   // 45ms - 125ms response speeds
      const activeConnections = Math.floor(requestCount * 1.5);                // Open TCP sockets
      const networkInMb = parseFloat((requestCount * 0.12).toFixed(2));        // Bandwidth ingress
      const networkOutMb = parseFloat((requestCount * 0.45).toFixed(2));       // Bandwidth egress
      const diskIo = parseFloat((Math.random() * 5 + 1).toFixed(2));           // Hard disk operations
      const restartCount = 0;                                                  // Process crash counters

      // 3. Batch insert the 10 DevOps metrics cleanly into PostgreSQL
      await pool.query(
        `INSERT INTO app_metrics (
          deployment_id, cpu_usage, memory_usage, request_count, error_rate, 
          latency_ms, active_connections, network_in_mb, network_out_mb, 
          disk_io, restart_count, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          app.id, cpuUsage, memoryUsage, requestCount, errorRate,
          latencyMs, activeConnections, networkInMb, networkOutMb, 
          diskIo, restartCount, timestamp
        ]
      );

      // 4. (Optional) Optional Real-Time Socket emit to frontend rooms can be called here:
      // io.to(`room:${app.id}`).emit('live-metrics', { ...metrics });
    }

    // 5. Cost Optimization Maintenance: Delete metrics older than 12 hours to prevent disk bloat
    await pool.query(
      "DELETE FROM app_metrics WHERE timestamp < NOW() - INTERVAL '12 hours'"
    );

    console.log(`[CloudWatch Agent Mock]: Logged DevOps metrics for ${activeDeployments.rows.length} apps.`);
  } catch (err) {
    console.error("Error in background metric collection worker:", err.message);
  }
}

/**
 * Starts the background monitoring loop
 */
function startMonitoringService() {
  console.log("🚀 CloudWatch Metrics Monitoring Service Initiated (60-second intervals)...");
  
  // Run the collector every 60 seconds
  setInterval(collectSystemMetrics, 60 * 1000);
}

module.exports = { startMonitoringService };