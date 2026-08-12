const logger = require("../../monitoring/logger.service");
const path = require("path");
const os = require("os");
const fs = require("fs");
const securityMetrics = require("../../monitoring/security-metadata.service");
const docker = require("./docker-runner.service");

class TrivyScanner {
  async scan({
    deploymentId,
    projectName,
    image,
    report,
  }) {
    await logger.info(
      deploymentId,
      "SECURITY",
      `Running Trivy on ${image}`,
      projectName,
    );

    let result;

    try {
      result = await this.execute(image);
      if (result.skipped) {
        await logger.error(
          deploymentId,
          "SECURITY",
          "Trivy scan failed. Deployment blocked.",
          projectName
        );
        throw new Error(
          "Trivy security scan failed"
        );
      }
    } catch (err) {

      await logger.warning(
        deploymentId,
        "SECURITY",
        `Trivy skipped: ${err.message}`
      );

      return;
    }

    if (!result || !Array.isArray(result.Results)) {
      await logger.success(
        deploymentId,
        "SECURITY",
        "Trivy scan completed. No vulnerabilities found."
      );
      return;
    }
    securityMetrics.securityInfo
      .labels(
        deploymentId,
        image,
        new Date().toISOString()
      )
      .set(1);


    let totalFindings = 0;

    for (const target of result.Results) {
      if (!target.Vulnerabilities) continue;

      totalFindings += target.Vulnerabilities.length;

      for (const vuln of target.Vulnerabilities) {
        report.findings.push({
          scanner: "Trivy",
          severity: vuln.Severity,
          package: vuln.PkgName,
          installed: vuln.InstalledVersion,
          fixed: vuln.FixedVersion || "Not Available",
          cve: vuln.VulnerabilityID,
          title: vuln.Title || "",
          target: target.Target,
        });

        switch (vuln.Severity) {
          case "CRITICAL":
            report.critical++;
            break;

          case "HIGH":
            report.high++;
            break;

          case "MEDIUM":
            report.medium++;
            break;

          default:
            report.low++;
        }
      }
    }
    securityMetrics.vulnerabilities
      .labels(deploymentId, "CRITICAL")
      .set(report.critical);

    securityMetrics.vulnerabilities
      .labels(deploymentId, "HIGH")
      .set(report.high);

    securityMetrics.vulnerabilities
      .labels(deploymentId, "MEDIUM")
      .set(report.medium);

    securityMetrics.vulnerabilities
      .labels(deploymentId, "LOW")
      .set(report.low);
    report.scanners.push({
      scanner: "Trivy",
      findings: totalFindings,
    });

    await logger.success(
      deploymentId,
      "SECURITY",
      `Critical:${report.critical} High:${report.high} Medium:${report.medium} Low:${report.low}`,
      projectName,
    );

    await logger.success(
      deploymentId,
      "SECURITY",
      `Packages scanned : ${result.Results.length}`,
      projectName
    );

    await logger.success(
      deploymentId,
      "SECURITY",
      `Image scan completed`,
      projectName
    );
  }
  async execute(image) {
    const result = await docker.run([

      "-v",
      "/var/run/docker.sock:/var/run/docker.sock",

      "-v",
      "trivy-cache:/root/.cache/trivy",

      "aquasec/trivy:latest",

      "image",

      "--format",
      "json",

      "--scanners",
      "vuln",

      "--severity",
      "CRITICAL,HIGH,MEDIUM,LOW",

      "--ignore-unfixed",

      "--no-progress",

      image
    ]);
    if (result.code !== 0) {
      return {
        skipped: true,
        Results: []
      };
    }

    if (!result.stdout.trim()) {
      return {
        Results: []

      };
    }
    return JSON.parse(result.stdout);

  }
}

module.exports = new TrivyScanner();