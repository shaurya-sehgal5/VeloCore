const runtimeStatus = require("../services/runtime/runtime-status.service");

exports.stream = (req, res) => {

  res.setHeader(
    "Content-Type",
    "text/event-stream"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  runtimeStatus.register(
    req.params.deploymentId,
    res
  );

  req.on("close", () => {
    runtimeStatus.remove(
      req.params.deploymentId
    );
  });

};