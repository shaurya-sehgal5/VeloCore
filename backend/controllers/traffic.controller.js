const traffic = require("../services/traffic-switch.service");

exports.switch = async (req, res) => {
  try {
    const result = await traffic.switch(
      req.params.deploymentId,
      req.body.slot
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.active = async (req, res) => {
  try {
    res.json({
      activeSlot: await traffic.active(
        req.params.deploymentId
      ),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};