const { spawn } = require("child_process");

class TrivyService {
  scan(imageName) {
    return new Promise((resolve, reject) => {
      const process = spawn("trivy", [
        "image",
        "--scanners",
        "vuln",
        "--severity",
        "CRITICAL",
        "--exit-code",
        "1",
        "--no-progress",
        imageName,
      ]);

      let output = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        output += data.toString();
      });

      process.on("error", reject);

      process.on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(output));
        }
      });
    });
  }
}

module.exports = new TrivyService();