const logsService = require('../services/monitoring/logs.service');

exports.getAllLogs = async (req, res) => {
    try {
        const { start, end, limit } = req.query;
        const logs = await logsService.all({ start, end, limit: limit ? Number(limit) : undefined });
        return res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        console.error('[Logs Controller] getAllLogs error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch logs.' });
    }
};

exports.getDeploymentLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const { start, end, limit } = req.query;
        const logs = await logsService.deployment(id, { start, end, limit: limit ? Number(limit) : undefined });
        return res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        console.error('[Logs Controller] getDeploymentLogs error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch deployment logs.' });
    }
};


exports.getStageLogs = async (req, res) => {
    try {
        const { stage } = req.params;
        const { start, end, limit } = req.query;
        const logs = await logsService.stage(stage, { start, end, limit: limit ? Number(limit) : undefined });
        return res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        console.error('[Logs Controller] getStageLogs error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch stage logs.' });
    }
};

exports.getLevelLogs = async (req, res) => {
    try {
        const { level } = req.params;
        const { start, end, limit } = req.query;
        const logs = await logsService.level(level, { start, end, limit: limit ? Number(limit) : undefined });
        return res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        console.error('[Logs Controller] getLevelLogs error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch level logs.' });
    }
};