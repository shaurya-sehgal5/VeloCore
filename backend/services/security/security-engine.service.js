const logger = require("../monitoring/logger.service");
const gitleaks = require("./scanners/gitleaks.service");
const npmAudit = require("./scanners/npm-audit.service");
const metrics = require("../monitoring/metrics.service");
const sonarqube = require("./scanners/sonarqube.service");

class SecurityEngine {
  async run({
    deploymentId,
    workspace,
    graph,
  }) {
    await logger.milestone(
      deploymentId,
      "SECURITY_STARTED",
      "SECURITY",
      "Security pipeline started."
    );

    const securityStart = Date.now();

    const report = {
      score: 100,
      scanners: [],
      findings: [],
      secrets: [],
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      passed: true,
    };

    /*
    ==========================================
    GITLEAKS
    ==========================================
    */

    let gitleaksStatus = "SUCCESS";

    await logger.info(
      deploymentId,
      "GITLEAKS",
      "Scanning repository for exposed secrets..."
    );

    try {
      const secretResult = await gitleaks.scan(
        workspace.path,
        deploymentId
      );

      report.secrets = secretResult.findings || [];

      report.scanners.push({
        scanner: "Gitleaks",
        findings: report.secrets.length,
      });

      if (secretResult.skipped) {
        gitleaksStatus = "SKIPPED";

        await logger.warning(
          deploymentId,
          "GITLEAKS",
          "Secret scan skipped."
        );
      } else if (report.secrets.length > 0) {
        await logger.error(
          deploymentId,
          "GITLEAKS",
          `${report.secrets.length} secret(s) detected`
        );

        report.findings.push(
          ...report.secrets.map((f) => ({
            scanner: "Gitleaks",
            severity: "CRITICAL",
            title: f.RuleID,
            file: f.File,
            line: f.StartLine,
          }))
        );
      } else {
        await logger.success(
          deploymentId,
          "GITLEAKS",
          "Gitleaks passed."
        );
      }
    } catch (err) {
      gitleaksStatus = "FAILED";

      await logger.error(
        deploymentId,
        "GITLEAKS",
        `Gitleaks failed: ${err.message}`
      );

      await logger.detail(
        deploymentId,
        "GITLEAKS",
        "ERROR",
        err.stack || err.message
      );
    }

    /*
    ==========================================
    SONARQUBE
    ==========================================
    */

    let sonarStatus = "SUCCESS";

    await logger.info(
      deploymentId,
      "SONARQUBE",
      "Running SonarQube..."
    );

    try {
      const sonar = await sonarqube.scan({
        deploymentId,

        projectKey:
          `${process.env.SONAR_PROJECT_PREFIX}-${deploymentId}`,

        projectName:
          graph.frontend?.name ||
          graph.backend?.name ||
          "application",

        source: workspace.path,
      });

      report.scanners.push(sonar);

      report.findings.push({
        scanner: "SonarQube",
        severity: sonar.passed ? "INFO" : "HIGH",
        title: "Quality Gate",
      });

      if (!sonar.passed) {
        report.high++;
      }

      await logger.success(
        deploymentId,
        "SONARQUBE",
        `Quality Gate: ${sonar.passed ? "PASSED" : "FAILED"
        } | Bugs:${sonar.bugs} Vulnerabilities:${sonar.vulnerabilities} Coverage:${sonar.coverage}%`
      );
    } catch (err) {
      sonarStatus = "FAILED";

      await logger.error(
        deploymentId,
        "SONARQUBE",
        `SonarQube failed: ${err.message}`
      );

      await logger.detail(
        deploymentId,
        "SONARQUBE",
        "ERROR",
        err.stack || err.message
      );
    }

    /*
    ==========================================
    NPM AUDIT
    ==========================================
    */

    let npmStatus = "SUCCESS";

    await logger.info(
      deploymentId,
      "NPM_AUDIT",
      "Scanning project dependencies..."
    );

    for (const node of graph.nodes) {
      try {
        const audit = await npmAudit.scan(
          node,
          deploymentId
        );

        if (!audit) continue;

        report.critical += audit.critical || 0;
        report.high += audit.high || 0;
        report.medium += audit.medium || 0;
        report.low += audit.low || 0;

        report.scanners.push(audit);

        await logger.success(
          deploymentId,
          "NPM_AUDIT",
          `Dependency scan completed | Critical:${audit.critical} High:${audit.high} Medium:${audit.medium} Low:${audit.low}`,
          node.name
        );
      } catch (err) {
        npmStatus = "FAILED";

        await logger.error(
          deploymentId,
          "NPM_AUDIT",
          `${node.name}: npm audit failed`
        );

        await logger.detail(
          deploymentId,
          "NPM_AUDIT",
          "ERROR",
          err.stack || err.message,
          node.name
        );
      }
    }

    /*
    ==========================================
    SCORE
    ==========================================
    */

    report.score -= report.secrets.length * 20;
    report.score -= report.critical * 20;
    report.score -= report.high * 10;
    report.score -= report.medium * 5;
    report.score -= report.low;

    const sonarReport = report.scanners.find(
      (s) => s.scanner === "SonarQube"
    );

    if (sonarReport) {
      if (!sonarReport.passed) {
        report.score -= 15;
      }

      if (sonarReport.coverage < 80) {
        report.score -= 5;
      }
    }

    /*
    ==========================================
    FAILED SCANNERS
    ==========================================
    */

    if (sonarStatus === "FAILED") {
      report.passed = false;
    }

    if (gitleaksStatus === "FAILED") {
      report.passed = false;
    }

    if (npmStatus === "FAILED") {
      report.passed = false;
    }

    /*
    ==========================================
    SECURITY GATE
    ==========================================
    */

    if (
      report.secrets.length > 0 ||
      report.critical > 0 ||
      (sonarReport && !sonarReport.passed)
    ) {
      report.passed = false;
    }

    report.score = Math.max(report.score, 0);

    /*
    ==========================================
    SUMMARY
    ==========================================
    */

    await logger.milestone(
      deploymentId,
      "SECURITY_COMPLETED",
      "SECURITY",
      `Security Score: ${report.score}/100`
    );

    await logger.success(
      deploymentId,
      "SECURITY",
      `Secrets:${report.secrets.length} Critical:${report.critical} High:${report.high}`
    );

    metrics.securityScore
      .labels(deploymentId)
      .set(report.score);

    metrics.securityCritical
      .labels(graph.frontend?.name || "project")
      .set(report.critical);

    metrics.securityHigh
      .labels(graph.frontend?.name || "project")
      .set(report.high);

    metrics.securityMedium
      .labels(graph.frontend?.name || "project")
      .set(report.medium);

    metrics.securityLow
      .labels(graph.frontend?.name || "project")
      .set(report.low);

    metrics.securityScans.inc({
      scanner: "gitleaks",
      status: gitleaksStatus,
    });

    metrics.securityScans.inc({
      scanner: "npm-audit",
      status: npmStatus,
    });

    metrics.securityScans.inc({
      scanner: "sonarqube",
      status: sonarStatus,
    });

    metrics.securityDuration
      .labels("pipeline")
      .observe(
        (Date.now() - securityStart) / 1000
      );

    return report;
  }
}

module.exports = new SecurityEngine();