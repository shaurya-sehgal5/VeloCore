const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class NpmAuditScanner {
  async scan(node) {
   
    if (node.packageManager !== "npm") {
      return null;
    }

    if (!fs.existsSync(path.join(node.path, "package.json"))) {
      return null;
    }

    return await this.audit(node);
  }

  audit(node) {
    return new Promise((resolve) => {
      const child = spawn(
        "npm",
        ["audit", "--json"],
        {
          cwd: node.path,
          shell: true,
        }
      );

      let out = "";

      child.stdout.on("data", (data) => {
        out += data.toString();
      });

      child.on("close", () => {
        try {
          const json = JSON.parse(out);

          resolve({
            scanner: "npm-audit",
            project: node.name,
            critical: json.metadata.vulnerabilities.critical,
            high: json.metadata.vulnerabilities.high,
            medium: json.metadata.vulnerabilities.moderate,
            low: json.metadata.vulnerabilities.low,
          });
        } catch {
          resolve(null);
        }
      });
    });
  }
}

module.exports = new NpmAuditScanner();