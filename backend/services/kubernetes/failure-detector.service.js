class FailureDetector {

  isFailed(pod) {

    return [
      "CrashLoopBackOff",
      "ImagePullBackOff",
      "ErrImagePull",
      "OOMKilled",
      "Error",
      "Failed",
    ].includes(
      pod.status?.containerStatuses?.[0]?.state?.waiting?.reason
    );

  }

}

module.exports = new FailureDetector();