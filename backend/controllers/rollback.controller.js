const rollbackEngine = require("../services/traffic/rollback-engine.service");

exports.rollback = async (req, res) => {
  try {
    const runtime = await rollbackEngine.rollback(
      req.params.deploymentId
    );

    res.json(runtime);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};