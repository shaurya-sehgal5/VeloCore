const redeployService = require("../services/deployment/redeploy.service");

exports.redeploy = async (req, res) => {
  try {
    console.log("REDEPLOY CONTROLLER HIT");

    const deployment = await redeployService.redeploy(
      req.params.deploymentId,
      req.user
    );

    res.json(deployment);
  } catch (err) {
    console.error("REDEPLOY ERROR:");
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};