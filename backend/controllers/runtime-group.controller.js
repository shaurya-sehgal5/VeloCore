const runtimeGroup = require("../services/runtime-group.service");

exports.list = (req, res) => {
  const runtimes = runtimeGroup.get(
    req.params.deploymentId
  );

  res.json({
    count: runtimes.length,
    runtimes,
  });
};