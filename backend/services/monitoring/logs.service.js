const loki = require("../monitoring/loki/loki.service");

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

function getRange() {
    return {
        start: `${Date.now() - DEFAULT_LOOKBACK_MS}000000`,
        end: `${Date.now()}000000`,
    };
}

class LogsService {
    async deployment(deploymentId, limit = 500) {
        const { start, end } = getRange();

        return loki.query({
            query: `{deployment="${deploymentId}"}`,
            start,
            end,
            limit,
        });
    }

    async project(project, limit = 500) {
        const { start, end } = getRange();

        return loki.query({
            query: `{project="${project}"}`,
            start,
            end,
            limit,
        });
    }

    async level(level, limit = 500) {
        const { start, end } = getRange();

        return loki.query({
            query: `{level="${level}"}`,
            start,
            end,
            limit,
        });
    }

    async stage(stage, limit = 500) {
        const { start, end } = getRange();

        return loki.query({
            query: `{stage="${stage}"}`,
            start,
            end,
            limit,
        });
    }

    async all(limit = 500) {
        const { start, end } = getRange();

        return loki.query({
            query: `{app="velocore"}`,
            start,
            end,
            limit,
        });
    }
}

module.exports = new LogsService();