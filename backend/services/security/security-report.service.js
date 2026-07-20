const db = require("../../config/db");

class SecurityReportService {
  async save(deploymentId, report) {
    await db.query(
      `
      INSERT INTO deployment_security
      (
        deployment_id,
        score,
        secrets,
        critical,
        high,
        medium,
        low,
        passed,
        scanners
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      ON CONFLICT (deployment_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        secrets = EXCLUDED.secrets,
        critical = EXCLUDED.critical,
        high = EXCLUDED.high,
        medium = EXCLUDED.medium,
        low = EXCLUDED.low,
        passed = EXCLUDED.passed,
        scanners = EXCLUDED.scanners
      `,
      [
        deploymentId,
        report.score,
        report.secrets.length,
        report.critical,
        report.high,
        report.medium,
        report.low,
        report.passed,
        JSON.stringify(report.scanners ?? []),
      ]
    );
  }

  async get(deploymentId) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM deployment_security
      WHERE deployment_id = $1
      `,
      [deploymentId]
    );

    return rows[0] || null;
  }

  summarize(report) {
    return {
      score: report.score,
      critical: report.critical,
      high: report.high,
      medium: report.medium,
      low: report.low,
      secrets: report.secrets,
      passed: report.passed,
    };
  }
}

module.exports = new SecurityReportService();