const { getIO } = require("../config/socket");

class LoggerService {

    log(level, message) {
        console.log(`[${level}] ${message}`);
    }

    info(message) {
        this.log("INFO", message);
    }

    success(message) {
        this.log("SUCCESS", message);
    }

    warning(message) {
        this.log("WARNING", message);
    }

    error(message) {
        this.log("ERROR", message);
    }

    deployment(deploymentId, message) {

        this.info(message);

        try {

            const io = getIO();

            io.to(deploymentId).emit("live_logs", message);

        } catch (_) {
            // Socket server not initialized
        }

    }

}

module.exports = new LoggerService();