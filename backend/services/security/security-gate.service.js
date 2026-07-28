const config = require("../../config/env")

class SecurityGate {
  validate(report) {
    const blockSecrets =
      config.BLOCK_ON_SECRETS === "true";

    const blockCritical =
      config.BLOCK_ON_CRITICAL === "true";

    if (blockSecrets && report.secrets.length) {
      throw new Error(
        `Security Gate Failed (${report.secrets.length} secret(s) detected)`
      );
    }

    if (blockCritical && report.critical > 0) {
      throw new Error(
        `Security Gate Failed (${report.critical} critical vulnerabilities)`
      );
    }

    return true;
  }
}

module.exports = new SecurityGate();