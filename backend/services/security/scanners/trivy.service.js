const { spawn } = require("child_process");
const logger = require("../../monitoring/logger.service");
const path = require("path");
const os = require("os");
const fs = require("fs");
const securityMetrics = require("../../monitoring/security-metadata.service");

class TrivyScanner {
  async scan({
    deploymentId,
    image,
    report,
  }) {
    await logger.info(
      deploymentId,
      "SECURITY",
      "Running Trivy image scan..."
    );

    let result;

    try {
      result = await this.execute(image);
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

    report.scanners.push({
      scanner: "Trivy",
      findings: totalFindings,
    });

    await logger.success(
      deploymentId,
      "SECURITY",
      `Trivy completed (${totalFindings} vulnerabilities found)`
    );
  }

  execute(image) {
    return new Promise((resolve, reject) => {

      // Persistent cache shared across all deployments
      const cacheDir = path.join(
        os.homedir(),
        ".velocore",
        "trivy-cache"
      );

      fs.mkdirSync(cacheDir, { recursive: true });

      const child = spawn("trivy", [
        "image",

        "--cache-dir",
        cacheDir,

        "--skip-db-update",

        "--format",
        "json",

        "--scanners",
        "vuln",

        "--no-progress",

        image,
      ]);

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", reject);

      child.on("close", (code) => {

        if (code !== 0) {
          return reject(
            new Error(stderr || `Trivy exited with code ${code}`)
          );
        }

        if (!stdout.trim()) {
          return resolve({
            Results: [],
          });
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (err) {
          reject(
            new Error(
              `Failed to parse Trivy JSON:\n${stderr || err.message}`
            )
          );
        }
      });

    });
  }
}

module.exports = new TrivyScanner();