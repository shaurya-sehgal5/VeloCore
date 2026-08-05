const docker = require("./docker-runner.service");

class GitleaksService {

  async scan(source) {

    const result = await docker.run([

      "-v",
      `${source}:/repo`,

      "zricethezav/gitleaks:latest",

      "detect",

      "--source=/repo",

      "--report-format=json",

      "--report-path=-",

      "--no-banner"

    ]);

    let findings = [];

    try {

      findings = result.stdout
        ? JSON.parse(result.stdout)
        : [];

    } catch { }

    return {

      skipped: false,

      findings,

      total: findings.length,

      stderr: result.stderr

    };

  }

}

module.exports = new GitleaksService();