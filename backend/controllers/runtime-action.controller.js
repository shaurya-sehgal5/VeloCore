const restartService = require("../services/restart.service");
const stopService = require("../services/stop.service");
const destroyService = require("../services/destroy.service");
const logsService = require("../services/logs.service");
const statsService = require("../services/stats.service");

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

exports.logs = async (req, res) => {
  try {
    const logs = await logsService.logs(
      req.params.deploymentId
    );

    res.send(logs);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.stats = async (req, res) => {
  try {
    const stats = await statsService.stats(
      req.params.deploymentId
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};