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

    try {

      findings =
        result.stdout
          ? JSON.parse(result.stdout)
          : [];

    } catch {

      /*
      Raw output is still useful for debugging,
      but it belongs only in Detailed Logs.
      */

      if (
        deploymentId &&
        result.stdout?.trim()
      ) {

        await logger.detail(
          deploymentId,
          "GITLEAKS",
          "INFO",
          result.stdout.trim(),
          projectName
        );
      }
    }

    /*
    ------------------------------------------
    Detailed findings
    ------------------------------------------
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
    ------------------------------------------
    STDERR → Detailed only
    ------------------------------------------
    */

    if (
      deploymentId &&
      result.stderr?.trim()
    ) {

      const lines =
        result.stderr
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);

      for (const line of lines) {

        await logger.detail(
          deploymentId,
          "GITLEAKS",
          "ERROR",
          line,
          projectName
        );
      }
    }

    return {

      skipped: false,

      findings,

      total:
        findings.length,

      stderr:
        result.stderr,
    };
  }
}

module.exports =
  new GitleaksService();