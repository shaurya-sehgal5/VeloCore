const runtimeQueryService = require("../services/runtime/runtime-query.service");
const runtimeManager = require("../services/runtime/runtime-manager.service");
const runtimeQuery = require("../services/runtime/runtime-query.service");

/*
------------------------------------
Deployment Runtime (Database)
------------------------------------
*/

exports.list = async (req, res) => {
  try {
    const services = await runtimeQueryService.getByDeployment(
      req.params.deploymentId,
    );

    res.json({
      deploymentId: req.params.deploymentId,
      services,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

/*
------------------------------------
Live Runtime (Memory)
------------------------------------
*/

exports.live = (req, res) => {
  const runtimes = runtimeManager.list();

  res.json({
    total: runtimes.length,
    runtimes,
  });
};

/*
------------------------------------
Single Live Runtime
------------------------------------
*/

exports.get = (req, res) => {
  const runtime = runtimeManager
    .list()
    .find(
      (r) => r.deploymentId === req.params.deploymentId,
    );

  if (!runtime) {
    return res.status(404).json({
      error: "Runtime not found",
    });
  }

  res.json(runtime);
};

exports.group = async (req, res) => {
  try {
    const runtimes = await runtimeQuery.group(
      req.params.deploymentId,
    );

    res.json(runtimes);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.all = async (req, res) => {
  try {
    res.json(await runtimeQuery.all());
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};