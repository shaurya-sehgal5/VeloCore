const axios = require("axios");
const scanner = require("sonarqube-scanner");

class SonarQubeService {
  async scan({
    deploymentId,
    projectKey,
    projectName,
    source,
  }) {
    await this.ensureProject(projectKey, projectName);

    await this.runScanner({
      projectKey,
      projectName,
      source,
    });

    return await this.waitForQualityGate(projectKey);
  }

  async ensureProject(projectKey, projectName) {
    try {
      await axios.post(
        `${process.env.SONAR_URL}/api/projects/create`,
        null,
        {
          params: {
            project: projectKey,
            name: projectName,
          },
          auth: {
            username: process.env.SONAR_TOKEN,
            password: "",
          },
        }
      );
    } catch (err) {
      if (
        err.response &&
        err.response.data &&
        err.response.data.errors &&
        err.response.data.errors[0].msg.includes("already exists")
      ) {
        return;
      }

      throw err;
    }
  }

  runScanner({
    projectKey,
    projectName,
    source,
  }) {
    return new Promise((resolve, reject) => {
      scanner(
        {
          serverUrl: process.env.SONAR_URL,

          token: process.env.SONAR_TOKEN,

          options: {
            "sonar.projectKey": projectKey,

            "sonar.projectName": projectName,

            "sonar.sources": source,

            "sonar.sourceEncoding": "UTF-8",

            "sonar.qualitygate.wait": "true",
          },
        },
        () => resolve()
      );
    });
  }

  async waitForQualityGate(projectKey) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const quality = await axios.get(
        `${process.env.SONAR_URL}/api/qualitygates/project_status`,
        {
          params: {
            projectKey,
          },
          auth: {
            username: process.env.SONAR_TOKEN,
            password: "",
          },
        }
      );

      if (quality.data.projectStatus) {
        return this.metrics(projectKey, quality.data.projectStatus.status);
      }
    }

    throw new Error("SonarQube timeout");
  }

  async metrics(projectKey, status) {
    const response = await axios.get(
      `${process.env.SONAR_URL}/api/measures/component`,
      {
        params: {
          component: projectKey,
          metricKeys:
            "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density",
        },
        auth: {
          username: process.env.SONAR_TOKEN,
          password: "",
        },
      }
    );

    const measures = {};

    for (const metric of response.data.component.measures) {
      measures[metric.metric] = Number(metric.value || 0);
    }

    return {
      scanner: "SonarQube",

      passed: status === "OK",

      bugs: measures.bugs || 0,

      vulnerabilities:
        measures.vulnerabilities || 0,

      codeSmells:
        measures.code_smells || 0,

      coverage:
        measures.coverage || 0,

      duplicatedLines:
        measures.duplicated_lines_density || 0,
    };
  }
}

module.exports = new SonarQubeService();