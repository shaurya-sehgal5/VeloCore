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
    const securityStart = Date.now();

    /*
    ==================================================
    SECURITY REPORT
    ==================================================
    */

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
    ==================================================
    GITLEAKS
    ==================================================
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

      report.secrets =
        Array.isArray(secretResult?.findings)
          ? secretResult.findings
          : [];

      report.scanners.push({
        scanner: "Gitleaks",
        findings: report.secrets.length,
      });

      /*
      ------------------------------------------
      Gitleaks findings
      ------------------------------------------
      */

      if (report.secrets.length > 0) {
        gitleaksStatus = "FAILED";

        report.critical +=
          report.secrets.length;

        report.findings.push(
          ...report.secrets.map((finding) => ({
            scanner: "Gitleaks",
            severity: "CRITICAL",
            title:
              finding.RuleID ||
              "Secret detected",
            file:
              finding.File ||
              "unknown",
            line:
              finding.StartLine ||
              null,
          }))
        );

        await logger.error(
          deploymentId,
          "GITLEAKS",
          `${report.secrets.length} secret(s) detected`
        );
      }

      /*
      ------------------------------------------
      Scanner execution failure
      ------------------------------------------
      */

      else if (secretResult?.failed) {
        gitleaksStatus = "FAILED";

        await logger.error(
          deploymentId,
          "GITLEAKS",
          `Secret scan failed with exit code ${secretResult.exitCode ?? "unknown"
          }`
        );
      }

      /*
      ------------------------------------------
      Passed
      ------------------------------------------
      */

      else {
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

      /*
      Detailed technical information stays
      outside the normal deployment log.
      */

      await logger.detail(
        deploymentId,
        "GITLEAKS",
        "ERROR",
        err.stack || err.message
      );
    }

    /*
    ==================================================
    SONARQUBE
    ==================================================
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

      /*
      ------------------------------------------
      Record quality gate result
      ------------------------------------------
      */

      if (!sonar.passed) {
        report.high++;

        report.findings.push({
          scanner: "SonarQube",
          severity: "HIGH",
          title: "Quality Gate",
        });
      }

      await logger.success(
        deploymentId,
        "SONARQUBE",
        `Quality Gate: ${sonar.passed
          ? "PASSED"
          : "FAILED"
        } | Bugs:${sonar.bugs || 0} Vulnerabilities:${sonar.vulnerabilities || 0
        } Coverage:${sonar.coverage || 0}%`
      );
    } catch (err) {
      sonarStatus = "FAILED";

      await logger.error(
        deploymentId,
        "SONARQUBE",
        "SonarQube analysis failed."
      );

      await logger.detail(
        deploymentId,
        "SONARQUBE",
        "ERROR",
        err.stack || err.message
      );
    }

    /*
    ==================================================
    DEPENDENCY AUDIT
    ==================================================
    */

    let npmStatus = "SUCCESS";

    await logger.info(
      deploymentId,
      "DEPENDENCIES",
      "Scanning project dependencies..."
    );

    for (const node of graph.nodes || []) {
      try {
        const audit =
          await npmAudit.scan(
            node,
            deploymentId
          );

        if (!audit) {
          continue;
        }

        const critical =
          audit.critical || 0;

        const high =
          audit.high || 0;

        const medium =
          audit.medium || 0;

        const low =
          audit.low || 0;

        report.critical += critical;
        report.high += high;
        report.medium += medium;
        report.low += low;

        report.scanners.push(audit);

        /*
        ------------------------------------------
        Dependency findings
        ------------------------------------------
        */

        if (critical > 0) {
          report.findings.push({
            scanner: "npm-audit",
            severity: "CRITICAL",
            title:
              `${critical} critical dependency vulnerability(ies)`,
            project: node.name,
          });
        }

        if (high > 0) {
          report.findings.push({
            scanner: "npm-audit",
            severity: "HIGH",
            title:
              `${high} high dependency vulnerability(ies)`,
            project: node.name,
          });
        }

        await logger.success(
          deploymentId,
          "DEPENDENCIES",
          `Dependency scan completed | Critical:${critical} High:${high} Medium:${medium} Low:${low}`,
          node.name
        );
      } catch (err) {
        npmStatus = "FAILED";

        await logger.error(
          deploymentId,
          "DEPENDENCIES",
          `${node.name}: dependency scan failed`
        );

        await logger.detail(
          deploymentId,
          "DEPENDENCIES",
          "ERROR",
          err.stack || err.message,
          node.name
        );
      }
    }

    /*
    ==================================================
    SONAR REPORT
    ==================================================
    */

    const sonarReport =
      report.scanners.find(
        (scanner) =>
          scanner.scanner === "SonarQube"
      );

    /*
    ==================================================
    SCORE
    ==================================================
    */

    report.score -=
      report.secrets.length * 20;

    /*
    Critical vulnerabilities already include
    Gitleaks findings.
    */

    report.score -=
      report.critical * 20;

    report.score -=
      report.high * 10;

    report.score -=
      report.medium * 5;

    report.score -=
      report.low;

    if (sonarReport) {
      if (!sonarReport.passed) {
        report.score -= 15;
      }

      if (
        typeof sonarReport.coverage ===
        "number" &&
        sonarReport.coverage < 80
      ) {
        report.score -= 5;
      }
    }

    /*
    ==================================================
    FAILED SCANNERS
    ==================================================
    */

    if (gitleaksStatus === "FAILED") {
      report.passed = false;
    }

    if (sonarStatus === "FAILED") {
      report.passed = false;
    }

    if (npmStatus === "FAILED") {
      report.passed = false;
    }

    /*
    ==================================================
    SECURITY GATE
    ==================================================
    */

    if (
      report.secrets.length > 0 ||
      report.critical > 0 ||
      (
        sonarReport &&
        !sonarReport.passed
      )
    ) {
      report.passed = false;
    }

    report.score =
      Math.max(
        0,
        Math.min(
          100,
          report.score
        )
      );

    /*
    ==================================================
    SECURITY SUMMARY
    ==================================================
    */

    await logger.success(
      deploymentId,
      "SECURITY",
      `Security checks completed — score ${report.score}/100.`
    );

    await logger.success(
      deploymentId,
      "SECURITY",
      `Secrets:${report.secrets.length} Critical:${report.critical} High:${report.high}`
    );

    /*
    ==================================================
    METRICS
    ==================================================
    */

    const metricProject =
      graph.frontend?.name ||
      graph.backend?.name ||
      "project";

    metrics.securityScore
      .labels(deploymentId)
      .set(report.score);

    metrics.securityCritical
      .labels(metricProject)
      .set(report.critical);

    metrics.securityHigh
      .labels(metricProject)
      .set(report.high);

    metrics.securityMedium
      .labels(metricProject)
      .set(report.medium);

    metrics.securityLow
      .labels(metricProject)
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
        (Date.now() - securityStart) /
        1000
      );

    return report;
  }
}

module.exports =
  new SecurityEngine();