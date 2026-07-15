const runtimeManager = require("../runtime/runtime-manager.service");

class RuntimeSyncService {

  sync(runtime) {

    runtimeManager.update(
      runtime.deploymentId,
      runtime.project,
      runtime.slot,
      runtime
    );

  }

}

module.exports = new RuntimeSyncService();