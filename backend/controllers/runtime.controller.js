const runtimeQueryService = require("../services/runtime-query.service");
const runtimeManager = require("../services/runtime-manager.service");

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
  res.json(runtimeManager.list());
};
/*
------------------------------------
Single Live Runtime
------------------------------------
*/

exports.get = (req, res) => {
  const runtime = runtimeManager.get(req.params.deploymentId);

  if (!runtime) {
    return res.status(404).json({
      error: "Runtime not found",
    });
  }

  res.json(runtime);
};
