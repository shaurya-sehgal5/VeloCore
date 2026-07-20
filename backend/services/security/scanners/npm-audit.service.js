const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../../monitoring/logger.service");

class NpmAuditScanner {

    async scan({
        deploymentId,
        graph,
        report,
    }) {

        logger.deployment(
            deploymentId,
            "📦 npm audit"
        );

        for (const node of graph.nodes) {

            if (node.packageManager !== "npm")
                continue;

            if (!fs.existsSync(path.join(node.path, "package.json")))
                continue;

            const audit = await this.audit(node);

            if (!audit)
                continue;

            report.critical += audit.critical;
            report.high += audit.high;
            report.medium += audit.medium;
            report.low += audit.low;

            report.scanners.push(audit);

            logger.deployment(
                deploymentId,
                `${node.name}
Critical : ${audit.critical}
High : ${audit.high}
Medium : ${audit.medium}
Low : ${audit.low}`
            );

        }

    }

    audit(node) {

        return new Promise((resolve) => {

            const child = spawn(
                "npm",
                ["audit", "--json"],
                {
                    cwd: node.path,
                    shell: true,
                }
            );

            let out = "";

            child.stdout.on("data", d => out += d);

            child.on("close", () => {

                try {

                    const json = JSON.parse(out);

                    resolve({

                        scanner: "npm-audit",

                        project: node.name,

                        critical: json.metadata.vulnerabilities.critical,

                        high: json.metadata.vulnerabilities.high,

                        medium: json.metadata.vulnerabilities.moderate,

                        low: json.metadata.vulnerabilities.low,

                    });

                }

                catch {

                    resolve(null);

                }

            });

        });

    }

}

module.exports = new NpmAuditScanner();