const logger = require("../monitoring/logger.service");
const gitleaks = require("./scanners/gitleaks.service");
const npmAudit = require("./scanners/npm-audit.service");
const trivy = require("./scanners/trivy.service");

class SecurityEngine {
    async run({
        deploymentId,
        workspace,
        graph,
        image,
    }) {
        logger.deployment(
            deploymentId,
            "🛡 Starting Security Pipeline..."
        );

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

        logger.deployment(
            deploymentId,
            "🔍 Running Gitleaks..."
        );

        const secretResult = await gitleaks.scan(workspace.path);

        report.secrets = secretResult.findings;

        report.scanners.push({
            scanner: "Gitleaks",
            findings: secretResult.findings.length,
        });

        if (secretResult.findings.length) {
            logger.warning(
                deploymentId,
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
            logger.success(
                deploymentId,
                "No secrets detected."
            );
        }

        /*
        ----------------------------------
        npm audit
        ----------------------------------
        */

        logger.deployment(
            deploymentId,
            "📦 Running npm audit..."
        );

        for (const node of graph.nodes) {
            const audit = await npmAudit.scan(node);

            if (!audit) continue;

            report.critical += audit.critical;
            report.high += audit.high;
            report.medium += audit.medium;
            report.low += audit.low;

            report.scanners.push(audit);

            logger.deployment(
                deploymentId,
                `${node.name}

Critical : ${audit.critical}
High     : ${audit.high}
Medium   : ${audit.medium}
Low      : ${audit.low}`
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

        logger.deployment(
            deploymentId,
            `
================ SECURITY REPORT ================

Secrets  : ${report.secrets.length}
Critical : ${report.critical}
High     : ${report.high}
Medium   : ${report.medium}
Low      : ${report.low}

Security Score : ${report.score}

Status : ${report.passed ? "PASSED" : "FAILED"}

===============================================
`
        );

        return report;
    }
}

module.exports = new SecurityEngine();