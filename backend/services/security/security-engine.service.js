const logger = require("../monitoring/logger.service");
const gitleaks = require("./scanners/gitleaks.service");
const npmAudit = require("./scanners/npm-audit.service");
const trivy = require("./scanners/trivy.service");
const metrics = require("../monitoring/metrics.service");
const sonarqube = require("./scanners/sonarqube.service");

class SecurityEngine {
  async run({
    deploymentId,
    workspace,
    graph,
    image,
  }) {
    await logger.milestone(
      deploymentId,
      "SECURITY_STARTED",
      "SECURITY",
      "Security pipeline started."
    );
    const started = Date.now();
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
    ----------------------------------
    Gitleaks
    ----------------------------------
    */

    let gitleaksStatus = "SUCCESS";

    await logger.info(
      deploymentId,
      "SECURITY",
      "Running Gitleaks..."
    );

    try {
      const secretResult = await gitleaks.scan(workspace.path);

      report.secrets = secretResult.findings || [];

      report.scanners.push({
        scanner: "Gitleaks",
        findings: report.secrets.length,
      });

      if (secretResult.skipped) {
        gitleaksStatus = "SKIPPED";

        await logger.warning(
          deploymentId,
          "SECURITY",
          "Gitleaks not installed. Skipping scan."
        );
      } else if (report.secrets.length > 0) {
        await logger.error(
          deploymentId,
          "SECURITY",
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
          "SECURITY",
          "Gitleaks passed."
        );
      }
    } catch (err) {
      gitleaksStatus = "FAILED";

      await logger.warning(
        deploymentId,
        "SECURITY",
        `Gitleaks failed: ${err.message}`
      );
    }

    /*
----------------------------------
SonarQube
----------------------------------
*/

    let sonarStatus = "SUCCESS";

    await logger.info(
      deploymentId,
      "SECURITY",
      "Running SonarQube..."
    );

    try {

      const sonar = await sonarqube.scan({

        deploymentId,

        projectKey: `${process.env.SONAR_PROJECT_PREFIX}-${deploymentId}`,

        projectName: graph.frontend?.name ||
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

        "SECURITY",

        `Quality Gate : ${sonar.passed ? "PASSED" : "FAILED"} | Bugs:${sonar.bugs} Vulnerabilities:${sonar.vulnerabilities} Coverage:${sonar.coverage}%`

      );

    } catch (err) {

      sonarStatus = "FAILED";

      await logger.warning(
        deploymentId,
        "SECURITY",
        `SonarQube failed:\n${err.stack || err.stderr || JSON.stringify(err, null, 2)}`
      );
    }

    /*
    ----------------------------------
    npm audit
    ----------------------------------
    */

    let npmStatus = "SUCCESS";

    await logger.info(
      deploymentId,
      "SECURITY",
      "Running npm audit..."
    );

    for (const node of graph.nodes) {
      try {
        const audit = await npmAudit.scan(node);

        if (!audit) continue;

        report.critical += audit.critical || 0;
        report.high += audit.high || 0;
        report.medium += audit.medium || 0;
        report.low += audit.low || 0;

        report.scanners.push(audit);

        await logger.success(
          deploymentId,
          "SECURITY",
          `${node.name} | Critical:${audit.critical} High:${audit.high} Medium:${audit.medium} Low:${audit.low}`
        );
      } catch (err) {
        npmStatus = "FAILED";

        await logger.warning(
          deploymentId,
          "SECURITY",
          `${node.name}: npm audit failed (${err.message})`
        );
      }
    }

    /*
    ----------------------------------
    Trivy
    ----------------------------------
    */

    let trivyStatus = "SUCCESS";

    if (image) {
      try {
        await logger.info(
          deploymentId,
          "SECURITY",
          "Running Trivy..."
        );

        await trivy.scan({
          deploymentId,
          image,
          report,
        });

        await logger.success(
          deploymentId,
          "SECURITY",
          "Trivy scan completed."
        );
        metrics.securityDuration
          .labels("trivy")
          .observe(
            (Date.now() - started) / 1000
          );
      } catch (err) {
        trivyStatus = "SKIPPED";

        await logger.warning(
          deploymentId,
          "SECURITY",
          `Trivy skipped: ${err.message}`
        );
      }
    }

    /*
    ----------------------------------
    Calculate Score
    ----------------------------------
    */

    report.score -= report.secrets.length * 20;
    report.score -= report.critical * 20;
    report.score -= report.high * 10;
    report.score -= report.medium * 5;
    report.score -= report.low;

    const sonarReport = report.scanners.find(
      s => s.scanner === "SonarQube"
    );

    if (sonarReport) {
      if (!sonarReport.passed) report.score -= 15;
      if (sonarReport.coverage < 80) report.score -= 5;
    }

    report.score = Math.max(report.score, 0);

    /*
    ----------------------------------
    Security Gate
    ----------------------------------
    */

    if (

      report.secrets.length > 0 ||

      report.critical > 0 ||

      (sonarReport && !sonarReport.passed)

    ) {
      report.passed = false;
    }

    /*
    ----------------------------------
    Summary
    ----------------------------------
    */

    await logger.milestone(
      deploymentId,
      "SECURITY_COMPLETED",
      "SECURITY",
      `Security Score : ${report.score}/100`
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

    metrics.securityScans.inc({
      scanner: "trivy",
      status: trivyStatus,
    });

    metrics.securityDuration
      .labels("pipeline")
      .observe((Date.now() - securityStart) / 1000);

    return report;
  }
}

module.exports = new SecurityEngine();