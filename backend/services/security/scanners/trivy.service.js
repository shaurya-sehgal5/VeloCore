const logger = require("../../monitoring/logger.service");
const securityMetrics = require("../../monitoring/security-metadata.service");
const docker = require("./docker-runner.service");

class TrivyScanner {

  async scan({
    deploymentId,
    projectName,
    image,
    report,
  }) {

    /*
    ------------------------------------------
    NORMAL LOG
    ------------------------------------------
    */

    await logger.info(
      deploymentId,
      "TRIVY",
      `Scanning image ${image}`,
      projectName
    );

    let result;

    try {

      result =
        await this.execute(
          image,
          deploymentId,
          projectName
        );

      if (result.skipped) {

        await logger.error(
          deploymentId,
          "TRIVY",
          "Image vulnerability scan failed. Deployment blocked.",
          projectName
        );

        throw new Error(
          "Trivy security scan failed"
        );
      }

    } catch (err) {

      await logger.error(
        deploymentId,
        "TRIVY",
        `Scan failed: ${err.message}`,
        projectName
      );

      throw err;
    }

    if (
      !result ||
      !Array.isArray(result.Results)
    ) {

      await logger.success(
        deploymentId,
        "SECURITY",
        "Trivy scan completed. No vulnerabilities found.",
        projectName
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

    /*
    ==================================================
    PROCESS FINDINGS
    ==================================================
    */

    for (
      const target of result.Results
    ) {

      if (
        !target.Vulnerabilities
      ) {
        continue;
      }

      totalFindings +=
        target.Vulnerabilities.length;

      /*
      ------------------------------------------
      Detailed target information
      ------------------------------------------
      */

      await logger.detail(
        deploymentId,
        "TRIVY",
        "INFO",
        `Target: ${target.Target || "unknown"}`,
        projectName
      );

      for (
        const vuln of
        target.Vulnerabilities
      ) {

        report.findings.push({
          scanner: "Trivy",
          severity: vuln.Severity,
          package: vuln.PkgName,
          installed: vuln.InstalledVersion,
          fixed:
            vuln.FixedVersion ||
            "Not Available",
          cve: vuln.VulnerabilityID,
          title: vuln.Title || "",
          target: target.Target,
        });

        /*
        ------------------------------------------
        DETAILED VULNERABILITY
        ------------------------------------------
        */

        await logger.detail(
          deploymentId,
          "TRIVY",
          vuln.Severity === "CRITICAL" ||
            vuln.Severity === "HIGH"
            ? "ERROR"
            : "INFO",
          [
            vuln.Severity,
            vuln.VulnerabilityID,
            vuln.PkgName,
            `installed=${vuln.InstalledVersion}`,
            `fixed=${vuln.FixedVersion || "N/A"}`,
            vuln.Title
              ? `title=${vuln.Title}`
              : "",
          ]
            .filter(Boolean)
            .join(" | "),
          projectName
        );

        switch (
        vuln.Severity
        ) {

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

    /*
    ==================================================
    METRICS
    ==================================================
    */

    securityMetrics.vulnerabilities
      .labels(
        deploymentId,
        "CRITICAL"
      )
      .set(report.critical);

    securityMetrics.vulnerabilities
      .labels(
        deploymentId,
        "HIGH"
      )
      .set(report.high);

    securityMetrics.vulnerabilities
      .labels(
        deploymentId,
        "MEDIUM"
      )
      .set(report.medium);

    securityMetrics.vulnerabilities
      .labels(
        deploymentId,
        "LOW"
      )
      .set(report.low);

    report.scanners.push({
      scanner: "Trivy",
      findings: totalFindings,
    });

    /*
    ==================================================
    NORMAL SUMMARY
    ==================================================
    */

    await logger.success(
      deploymentId,
      "TRIVY",
      `${image} — Critical:${report.critical} High:${report.high} Medium:${report.medium} Low:${report.low}`,
      projectName
    );

    await logger.info(
      deploymentId,
      "TRIVY",
      `Scanned ${result.Results.length} target(s).`,
      projectName
    );

    await logger.success(
      deploymentId,
      "TRIVY",
      "Image security scan completed.",
      projectName
    );
  }

  /*
  ==================================================
  RUN TRIVY
  ==================================================
  */

  async execute(
    image,
    deploymentId,
    projectName
  ) {

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

    if (
      deploymentId &&
      result.stderr?.trim()
    ) {

      const lines =
        result.stderr
          .split(/\r?\n/)
          .map((line) =>
            line.trim()
          )
          .filter(Boolean);

      for (const line of lines) {

        await logger.detail(
          deploymentId,
          "TRIVY",
          "INFO",
          line,
          projectName
        );
      }
    }

    if (result.code !== 0) {

      return {
        skipped: true,
        Results: [],
      };
    }

    if (
      !result.stdout.trim()
    ) {

      return {
        Results: [],
      };
    }

    return JSON.parse(
      result.stdout
    );
  }
}

module.exports =
  new TrivyScanner();