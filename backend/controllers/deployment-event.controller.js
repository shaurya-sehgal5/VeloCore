const service = require("../services/deployment/deployment-event.service");

exports.list = async (req, res) => {
  try {
    res.json(
      await service.list(
        req.params.deploymentId
      )
    );
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};