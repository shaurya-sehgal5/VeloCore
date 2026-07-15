const restartService = require("../services/runtime/restart.service");
const stopService = require("../services/runtime/stop.service");
const destroyService = require("../services/runtime/destroy.service");
const logsService = require("../services/runtime/logs.service");
const statsService = require("../services/runtime/stats.service");
const describeService = require("../services/runtime/describe.service");
const startService = require("../services/runtime/start.service");

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

exports.start = async (req, res) => {
  try {
    const runtime = await startService.start(
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

exports.describe = async (req, res) => {
  try {
    const data = await describeService.describe(
      req.params.deploymentId
    );

    res.send(data);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};