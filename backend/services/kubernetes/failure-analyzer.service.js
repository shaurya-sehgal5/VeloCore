class FailureAnalyzer {

    analyze(text = "") {

        const output = text.toLowerCase();

        if (output.includes("crashloopbackoff")) {
            return {
                code: "CrashLoopBackOff",
                reason: "Application crashed after startup.",
                suggestion: "Check application logs and startup command."
            };
        }

        if (output.includes("imagepullbackoff")) {
            return {
                code: "ImagePullBackOff",
                reason: "Unable to pull Docker image.",
                suggestion: "Verify image name and tag."
            };
        }

        if (output.includes("errimagepull")) {
            return {
                code: "ErrImagePull",
                reason: "Docker image could not be downloaded.",
                suggestion: "Verify registry credentials and image."
            };
        }

        if (output.includes("failedscheduling")) {
            return {
                code: "FailedScheduling",
                reason: "Cluster doesn't have enough resources.",
                suggestion: "Free resources or scale the cluster."
            };
        }

        if (output.includes("oomkilled")) {
            return {
                code: "OOMKilled",
                reason: "Container exceeded memory limit.",
                suggestion: "Increase memory or optimize the application."
            };
        }

        if (output.includes("deadlineexceeded")) {
            return {
                code: "Timeout",
                reason: "Deployment rollout timed out.",
                suggestion: "Inspect pod events and readiness probes."
            };
        }

        return null;
    }

}

module.exports = new FailureAnalyzer();