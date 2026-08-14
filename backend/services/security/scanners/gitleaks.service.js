const docker = require("./docker-runner.service");
const logger = require("../../monitoring/logger.service");

class GitleaksService {
  async scan(
    source,
    deploymentId = null,
    projectName = null
  ) {
    const result = await docker.run(
      [
        "-v",
        `${source}:/repo`,

        "zricethezav/gitleaks:latest",

        "detect",

        "--no-git",

        "--source=/repo",

        "--report-format=json",

        "--report-path=-",

        "--no-banner",
      ],
      {
        deploymentId,
        projectName,
        stage: "GITLEAKS",
      }
    );

    let findings = [];

    /*
    ==================================================
    PARSE GITLEAKS REPORT
    ==================================================
    */

    try {
      findings = result.stdout
        ? JSON.parse(result.stdout)
        : [];
    } catch (err) {
      /*
       * Do NOT dump raw Gitleaks output into
       * deployment logs.
       *
       * Invalid JSON means the scanner did not
       * return the expected report.
       */

      if (deploymentId) {
        await logger.error(
          deploymentId,
          "GITLEAKS",
          "Gitleaks returned an invalid security report.",
          projectName
        );
      }

      throw new Error(
        "Gitleaks returned an invalid security report."
      );
    }

    /*
    ==================================================
    FINDINGS
    ==================================================
    */

    if (
      deploymentId &&
      Array.isArray(findings)
    ) {
      for (const finding of findings) {
        await logger.detail(
          deploymentId,
          "GITLEAKS",
          "ERROR",
          [
            `Rule:${finding.RuleID || "unknown"}`,
            `File:${finding.File || "unknown"}`,
            `Line:${finding.StartLine || "unknown"}`,
            finding.Description
              ? `Description:${finding.Description}`
              : "",
          ]
            .filter(Boolean)
            .join(" | "),
          projectName
        );
      }
    }

    /*
    ==================================================
    GITLEAKS FAILURE
    ==================================================
    */

    if (
      result.exitCode !== undefined &&
      result.exitCode !== 0 &&
      findings.length === 0
    ) {
      throw new Error(
        "Gitleaks scan failed."
      );
    }

    return {
      skipped: false,
      findings,
      total: findings.length,
    };
  }
}

module.exports =
  new GitleaksService();