const { spawn } = require("child_process");

class GitleaksService {
  scan(source) {
    return new Promise((resolve, reject) => {
      const args = [
        "detect",
        "--source",
        source,
        "--report-format",
        "json",
      ];

      const process = spawn("gitleaks", args);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (d) => {
        stdout += d.toString();
      });

      process.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      process.on("close", () => {
        let findings = [];

        try {
          findings = stdout.trim()
            ? JSON.parse(stdout)
            : [];
        } catch {}

        resolve({
          findings,
          stderr,
        });
      });

      process.on("error", reject);
    });
  }
}

module.exports = new GitleaksService();