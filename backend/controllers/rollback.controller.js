const rollbackEngine = require("../services/traffic/rollback-engine.service");

exports.rollback = async (req, res) => {
  try {
    const runtime = await rollbackEngine.rollback(
      req.params.deploymentId
    );

    if (!runtime) {
      return res.status(404).json({
        error: "No rollback target found",
      });
    }

    res.json({
      success: true,
      runtime,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};