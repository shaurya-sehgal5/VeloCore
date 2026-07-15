const kubectl = require("./kubectl.service");
const logger = require("../monitoring/logger.service");

class RecoveryService {

  async restart(deployment) {

    logger.info(
      `♻ Recovering ${deployment}`
    );

    return kubectl.restart(
      deployment
    );

  }

}

module.exports = new RecoveryService();