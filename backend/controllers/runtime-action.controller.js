const restartService = require("../services/runtime/restart.service");
const stopService = require("../services/runtime/stop.service");
const destroyService = require("../services/runtime/destroy.service");


exports.restart = async (req, res) => {
  try {
    const runtime = await restartService.restart(
      req.params.deploymentId
    );

    res.json(runtime);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};


exports.stop = async (req, res) => {
  try {
    const runtime = await stopService.stop(
      req.params.deploymentId
    );

    res.json(runtime);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.destroy = async (req, res) => {
  try {
    await destroyService.destroy(
      req.params.deploymentId
    );

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};
