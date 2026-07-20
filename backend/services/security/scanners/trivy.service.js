const { spawn } = require("child_process");
const logger = require("../../monitoring/logger.service");

class TrivyScanner {
  async scan({
    deploymentId,
    image,
    report,
  }) {
    logger.deployment(
      deploymentId,
      "🐳 Running Trivy Image Scan..."
    );

    const result = await this.execute(image);

    if (!result || !Array.isArray(result.Results)) {
      logger.success(
        deploymentId,
        "Trivy scan completed. No vulnerabilities found."
      );
      return;
    }

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

    logger.deployment(
      deploymentId,
      `🐳 Trivy completed (${totalFindings} vulnerabilities found)`
    );
  }

  execute(image) {
    return new Promise((resolve, reject) => {
      const child = spawn("trivy", [
        "image",
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
        if (!stdout.trim()) {
          return reject(
            new Error(stderr || `Trivy exited with code ${code}`)
          );
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