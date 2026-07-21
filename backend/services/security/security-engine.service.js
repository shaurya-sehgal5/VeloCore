const logger = require("../monitoring/logger.service");
const gitleaks = require("./scanners/gitleaks.service");
const npmAudit = require("./scanners/npm-audit.service");
const trivy = require("./scanners/trivy.service");
const metrics = require("../monitoring/metrics.service");

class SecurityEngine {
    async run({
        deploymentId,
        workspace,
        graph,
        image,
    }) {
        await logger.milestone(
            deploymentId,
            "SECURITY_STARTED",
            "SECURITY",
            "Security pipeline started."
        );
        const securityStart = Date.now();

        try {

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
            ----------------------------------
            Gitleaks
            ----------------------------------
            */

            await logger.info(
                deploymentId,
                "SECURITY",
                "Running Gitleaks..."
            );
            const secretResult = await gitleaks.scan(workspace.path);

            report.secrets = secretResult.findings;

            report.scanners.push({
                scanner: "Gitleaks",
                findings: secretResult.findings.length,
            });

            if (secretResult.findings.length) {
                await logger.error(
                    deploymentId,
                    "SECURITY",
                    `${secretResult.findings.length} secret(s) detected`
                );
                report.findings.push(
                    ...secretResult.findings.map((f) => ({
                        scanner: "Gitleaks",
                        severity: "CRITICAL",
                        title: f.RuleID,
                        file: f.File,
                        line: f.StartLine,
                    }))
                );
            } else {
                await logger.success(
                    deploymentId,
                    "SECURITY",
                    "Gitleaks passed."
                );
            }

            /*
            ----------------------------------
            npm audit
            ----------------------------------
            */

            await logger.info(
                deploymentId,
                "SECURITY",
                "Running npm audit..."
            );

            for (const node of graph.nodes) {
                const audit = await npmAudit.scan(node);

                if (!audit) continue;

                report.critical += audit.critical;
                report.high += audit.high;
                report.medium += audit.medium;
                report.low += audit.low;

                report.scanners.push(audit);

                await logger.success(
                    deploymentId,
                    "SECURITY",
                    `${node.name} | Critical:${audit.critical} High:${audit.high} Medium:${audit.medium} Low:${audit.low}`
                );
            }

            /*
            ----------------------------------
            Trivy Image Scan
            ----------------------------------
            */

            if (image) {
                await trivy.scan({
                    deploymentId,
                    image,
                    report,
                });
            }

            /*
            ----------------------------------
            Calculate Score
            ----------------------------------
            */

            report.score -= report.secrets.length * 20;
            report.score -= report.critical * 20;
            report.score -= report.high * 10;
            report.score -= report.medium * 5;
            report.score -= report.low;

            report.score = Math.max(report.score, 0);

            /*
            ----------------------------------
            Security Gate
            ----------------------------------
            */

            if (
                report.secrets.length > 0 ||
                report.critical > 0
            ) {
                report.passed = false;
            }

            /*
            ----------------------------------
            Final Summary
            ----------------------------------
            */

            await logger.milestone(
                deploymentId,
                "SECURITY_COMPLETED",
                "SECURITY",
                `Security Score : ${report.score}/100`
            );

            await logger.success(
                deploymentId,
                "SECURITY",
                `Secrets:${report.secrets.length} Critical:${report.critical} High:${report.high}`
            );
            metrics.securityScore
                .labels(graph.frontend?.name || "project")
                .set(report.score);

            metrics.securityCritical
                .labels(graph.frontend?.name || "project")
                .set(report.critical);

            metrics.securityHigh
                .labels(graph.frontend?.name || "project")
                .set(report.high);

            metrics.securityMedium
                .labels(graph.frontend?.name || "project")
                .set(report.medium);

            metrics.securityLow
                .labels(graph.frontend?.name || "project")
                .set(report.low);

            metrics.securityScans.inc({
                scanner: "gitleaks",
                status: "SUCCESS"
            });

            metrics.securityScans.inc({
                scanner: "npm-audit",
                status: "SUCCESS"
            });

            metrics.securityScans.inc({
                scanner: "trivy",
                status: "SUCCESS"
            });

            return report;
        }
        finally {
            metrics.securityDuration
                .labels("pipeline")
                .observe((Date.now() - securityStart) / 1000);
        }
    }
}

module.exports = new SecurityEngine();