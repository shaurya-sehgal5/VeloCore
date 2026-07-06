const db = require("../config/db");
const { getIO } = require("../config/socket");

class StatusService {

    async update(deploymentId, status) {

        await db.query(
            `
            UPDATE deployments
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            `,
            [status, deploymentId]
        );

        try {

            const io = getIO();

            io.to(deploymentId).emit("status_update", {
                status
            });

        } catch (_) {}

    }

}

module.exports = new StatusService();