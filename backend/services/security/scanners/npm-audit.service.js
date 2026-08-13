const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../../monitoring/logger.service");

class NpmAuditScanner {

  async scan(
    node,
    deploymentId = null
  ) {

    if (
      node.packageManager !== "npm"
    ) {
      return null;
    }

    if (
      !fs.existsSync(
        path.join(
          node.path,
          "package.json"
        )
      )
    ) {
      return null;
    }

    return await this.audit(
      node,
      deploymentId
    );
  }

  audit(
    node,
    deploymentId
  ) {

    return new Promise(
      (resolve) => {

        const child =
          spawn(
            "npm",
            [
              "audit",
              "--json"
            ],
            {
              cwd: node.path,
              shell: true,
            }
          );

        let out = "";
        let err = "";

        /*
        --------------------------------------
        Raw audit output → Detailed
        --------------------------------------
        */

        child.stdout.on(
          "data",
          (data) => {

            out +=
              data.toString();
          }
        );

        child.stderr.on(
          "data",
          (data) => {

            err +=
              data.toString();
          }
        );

        child.on(
          "close",
          async () => {

            let json;

            try {

              json =
                JSON.parse(out);

            } catch {

              if (
                deploymentId &&
                err.trim()
              ) {

                await logger.detail(
                  deploymentId,
                  "NPM_AUDIT",
                  "ERROR",
                  err.trim(),
                  node.name
                );
              }

              return resolve(null);
            }

            /*
            ----------------------------------
            Detailed vulnerability data
            ----------------------------------
            */

            if (
              deploymentId &&
              json.vulnerabilities
            ) {

              for (
                const [
                  packageName,
                  vulnerability
                ]
                of Object.entries(
                  json.vulnerabilities
                )
              ) {

                await logger.detail(
                  deploymentId,
                  "NPM_AUDIT",
                  vulnerability.severity ===
                    "critical" ||
                    vulnerability.severity ===
                    "high"
                    ? "ERROR"
                    : "INFO",

                  [
                    `Package:${packageName}`,
                    `Severity:${vulnerability.severity || "unknown"}`,
                    `Via:${JSON.stringify(vulnerability.via || [])}`,
                    vulnerability.range
                      ? `Range:${vulnerability.range}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" | "),

                  node.name
                );
              }
            }

            const metadata =
              json.metadata?.vulnerabilities;

            if (!metadata) {
              return resolve(null);
            }

            resolve({

              scanner:
                "npm-audit",

              project:
                node.name,

              critical:
                metadata.critical || 0,

              high:
                metadata.high || 0,

              medium:
                metadata.moderate || 0,

              low:
                metadata.low || 0,
            });
          }
        );
      }
    );
  }
}

module.exports =
  new NpmAuditScanner();