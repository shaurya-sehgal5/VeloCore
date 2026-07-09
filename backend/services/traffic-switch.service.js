const db = require("../config/db");

class TrafficSwitchService {
  async switch(deploymentId, slot) {
    await db.query(
      `
      UPDATE deployments
      SET
        active_slot = $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [slot, deploymentId]
    );

    return {
      deploymentId,
      activeSlot: slot,
    };
  }

  async active(deploymentId) {
    const { rows } = await db.query(
      `
      SELECT active_slot
      FROM deployments
      WHERE id = $1
      `,
      [deploymentId]
    );

    if (!rows.length) {
      throw new Error("Deployment not found.");
    }

    return rows[0].active_slot || "blue";
  }
}

module.exports = new TrafficSwitchService();