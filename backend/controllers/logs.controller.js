const db = require("../config/db");
const logsService = require("../services/monitoring/logs.service");

async function resolveActiveDeployment(deploymentId) {
    const { rows } = await db.query(
        `
    SELECT
      COALESCE(
        p.current_deployment_id,
        d.id
      ) AS active_deployment_id
    FROM deployments d
    JOIN projects p
      ON p.id = d.project_id
    WHERE d.id = $1
    LIMIT 1
    `,
        [deploymentId]
    );

    return rows[0]?.active_deployment_id || deploymentId;
}

exports.getAllLogs = async (req, res) => {
    try {
        const { start, end, limit } = req.query;

        const logs = await logsService.all({
            start,
            end,
            limit: limit ? Number(limit) : undefined,
        });

        return res.json({
            success: true,
            count: logs.length,
            logs,
        });
    } catch (err) {
        console.error(
            "[Logs Controller] getAllLogs error:",
            err.message
        );

        return res.status(500).json({
            success: false,
            error: "Failed to fetch logs.",
        });
    }
};

exports.getDeploymentLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const { start, end, limit } = req.query;

        const activeDeploymentId =
            await resolveActiveDeployment(id);

        const logs = await logsService.deployment(
            activeDeploymentId,
            {
                start,
                end,
                limit: limit ? Number(limit) : undefined,
            }
        );

        return res.json({
            success: true,
            count: logs.length,
            deploymentId: activeDeploymentId,
            logs,
        });
    } catch (err) {
        console.error(
            "[Logs Controller] getDeploymentLogs error:",
            err.message
        );

        return res.status(500).json({
            success: false,
            error: "Failed to fetch deployment logs.",
        });
    }
};

exports.getStageLogs = async (req, res) => {
    try {
        const { stage } = req.params;
        const { start, end, limit } = req.query;

        const logs = await logsService.stage(stage, {
            start,
            end,
            limit: limit ? Number(limit) : undefined,
        });

        return res.json({
            success: true,
            count: logs.length,
            logs,
        });
    } catch (err) {
        console.error(
            "[Logs Controller] getStageLogs error:",
            err.message
        );

        return res.status(500).json({
            success: false,
            error: "Failed to fetch stage logs.",
        });
    }
};

exports.getLevelLogs = async (req, res) => {
    try {
        const { level } = req.params;
        const { start, end, limit } = req.query;

        const logs = await logsService.level(level, {
            start,
            end,
            limit: limit ? Number(limit) : undefined,
        });

        return res.json({
            success: true,
            count: logs.length,
            logs,
        });
    } catch (err) {
        console.error(
            "[Logs Controller] getLevelLogs error:",
            err.message
        );

        return res.status(500).json({
            success: false,
            error: "Failed to fetch level logs.",
        });
    }
};