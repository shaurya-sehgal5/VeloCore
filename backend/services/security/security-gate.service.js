class SecurityGate {

    validate(report) {

        if (report.secrets.length) {

            throw new Error(
                `Security Gate Failed (${report.secrets.length} secret(s) detected)`
            );

        }

        if (report.critical) {

            throw new Error(
                `Security Gate Failed (${report.critical} critical vulnerabilities)`
            );

        }

        return true;

    }

}

module.exports = new SecurityGate();