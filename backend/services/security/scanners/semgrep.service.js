const { spawn } = require("child_process");
const logger = require("../../monitoring/logger.service");

class SemgrepScanner {

    async scan({
        deploymentId,
        graph,
        report,
    }) {

        await logger.info(
            deploymentId,
            "SECURITY",
            "Running Semgrep..."
        );
        for (const node of graph.nodes) {

            const findings = await this.scanProject(node);

            if (!findings)
                continue;

            report.scanners.push({
                scanner: "Semgrep",
                project: node.name,
                findings: findings.length,
            });

            for (const finding of findings) {

                const severity = (
                    finding.extra?.severity || "INFO"
                ).toUpperCase();

                report.findings.push({

                    scanner: "Semgrep",

                    project: node.name,

                    severity,

                    title: finding.check_id,

                    message: finding.extra?.message,

                    file: finding.path,

                    line: finding.start?.line,

                });

                switch (severity) {

                    case "ERROR":
                        report.critical++;
                        break;

                    case "WARNING":
                        report.high++;
                        break;

                    default:
                        report.medium++;
                }

            }

            await logger.success(
                deploymentId,
                "SECURITY",
                `${node.name}: ${findings.length} issue(s)`
            );

        }

    }

    scanProject(node) {

        return new Promise((resolve) => {

            const process = spawn(
                "semgrep",
                [
                    "--config=auto",
                    "--json",
                    node.path,
                ],
                {
                    shell: true,
                }
            );

            let stdout = "";

            process.stdout.on("data", d => {
                stdout += d.toString();
            });

            process.on("close", () => {

                try {

                    const report = JSON.parse(stdout);

                    resolve(report.results || []);

                }

                catch {

                    resolve([]);

                }

            });

        });

    }

}

module.exports = new SemgrepScanner();