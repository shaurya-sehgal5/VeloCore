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
        "--report-path",
        "-",
        "--no-banner",
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

      child.on("close", (code) => {
        let findings = [];
        if (code !== 0 && !stdout.trim()) {
          return resolve({
            skipped: false,
            findings: [],
            stderr,
          });
        }
        try {
          findings = stdout.trim()
            ? JSON.parse(stdout)
            : [];
        } catch { }

        resolve({
          skipped: false,
          findings,
          scanned: true,
          files: source,
          total: findings.length,
          stderr,
        });
      });
    });
  }
}

module.exports = new GitleaksService();