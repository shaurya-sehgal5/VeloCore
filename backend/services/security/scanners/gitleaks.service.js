const { spawn } = require("child_process");

class GitleaksService {
  scan(source) {
    return new Promise((resolve) => {
      const args = [
        "detect",
        "--source",
        source,
        "--report-format",
        "json",
      ];

      const child = spawn("gitleaks", args);

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (d) => {
        stdout += d.toString();
      });

      child.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      child.on("error", (err) => {
        if (err.code === "ENOENT") {
          return resolve({
            skipped: true,
            findings: [],
            stderr: "Gitleaks not installed.",
          });
        }

        resolve({
          skipped: true,
          findings: [],
          stderr: err.message,
        });
      });

      child.on("close", () => {
        let findings = [];

        try {
          findings = stdout.trim()
            ? JSON.parse(stdout)
            : [];
        } catch {}

        resolve({
          skipped: false,
          findings,
          stderr,
        });
      });
    });
  }
}

module.exports = new GitleaksService();