class ProgressService {

  progress(deployment) {

    return {
      desired:
        deployment.status.replicas || 0,

      ready:
        deployment.status.readyReplicas || 0,

      updated:
        deployment.status.updatedReplicas || 0,

      available:
        deployment.status.availableReplicas || 0,
    };

  }

}

module.exports = new ProgressService();