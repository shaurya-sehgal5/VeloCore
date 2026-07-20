const securityReportService = require("../services/security/security-report.service");

class SecurityController {
    async getReport(req, res) {
        try {
            const { deploymentId } = req.params;

            const report =
                await securityReportService.get(deploymentId);

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: "Security report not found",
                });
            }

            return res.json({
                success: true,
                data: report,
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
}

module.exports = new SecurityController();