const axios = require("axios");
const docker = require("./docker-runner.service");
const logger = require("../../monitoring/logger.service");

class SonarQubeService {

    async scan({
        deploymentId,
        projectKey,
        projectName,
        source,
    }) {

        await logger.info(
            deploymentId,
            "SONARQUBE",
            `Starting SonarQube analysis for ${projectName}`,
            projectName
        );

        await this.ensureProject(
            projectKey,
            projectName
        );

        await this.runScanner({
            deploymentId,
            projectKey,
            projectName,
            source,
        });

        return await this.waitForQualityGate(
            deploymentId,
            projectKey,
            projectName
        );
    }

    async runScanner({
        deploymentId,
        projectKey,
        projectName,
        source,
    }) {

        const result = await docker.run(

            [

                "--network",
                "host",

                "-v",
                `${source}:/usr/src`,

                "-w",
                "/usr/src",

                "-e",
                `SONAR_HOST_URL=${process.env.SONAR_URL}`,

                "-e",
                `SONAR_TOKEN=${process.env.SONAR_TOKEN}`,

                "sonarsource/sonar-scanner-cli:latest",

                "sonar-scanner",

                `-Dsonar.projectKey=${projectKey}`,
                `-Dsonar.projectName=${projectName}`,
                "-Dsonar.sources=.",
                "-Dsonar.sourceEncoding=UTF-8",
                "-Dsonar.qualitygate.wait=true",
                `-Dsonar.host.url=${process.env.SONAR_URL}`,
                `-Dsonar.token=${process.env.SONAR_TOKEN}`,

            ],

            {
                deploymentId,
                projectName,
                stage: "SONARQUBE",
            }
        );

        /*
        ------------------------------------------
        Detailed scanner output
        ------------------------------------------
        */

        if (result.stdout?.trim()) {

            const lines =
                result.stdout
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(Boolean);

            for (const line of lines) {

                await logger.detail(
                    deploymentId,
                    "SONARQUBE",
                    "INFO",
                    line,
                    projectName
                );
            }
        }

        if (result.stderr?.trim()) {

            const lines =
                result.stderr
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(Boolean);

            for (const line of lines) {

                await logger.detail(
                    deploymentId,
                    "SONARQUBE",
                    "ERROR",
                    line,
                    projectName
                );
            }
        }

        if (result.code !== 0) {

            throw new Error(
                [
                    result.stderr,
                    result.stdout,
                ]
                    .filter(Boolean)
                    .join("\n")
            );
        }

        await logger.success(
            deploymentId,
            "SONARQUBE",
            "SonarQube analysis completed.",
            projectName
        );

        return result;
    }

    async ensureProject(
        projectKey,
        projectName
    ) {

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
                        username:
                            process.env.SONAR_TOKEN,
                        password: "",
                    },
                }
            );

        } catch (err) {

            if (
                err.response &&
                err.response.data &&
                err.response.data.errors &&
                err.response.data.errors[0] &&
                err.response.data.errors[0].msg &&
                err.response.data.errors[0].msg.includes(
                    "already exists"
                )
            ) {
                return;
            }

            throw err;
        }
    }

    async waitForQualityGate(
        deploymentId,
        projectKey,
        projectName
    ) {

        await logger.info(
            deploymentId,
            "SONARQUBE",
            "Waiting for SonarQube quality gate...",
            projectName
        );

        for (
            let i = 0;
            i < 20;
            i++
        ) {

            await new Promise(
                r => setTimeout(r, 3000)
            );

            try {

                const quality =
                    await axios.get(
                        `${process.env.SONAR_URL}/api/qualitygates/project_status`,
                        {
                            params: {
                                projectKey,
                            },
                            auth: {
                                username:
                                    process.env.SONAR_TOKEN,
                                password: "",
                            },
                        }
                    );

                if (
                    quality.data &&
                    quality.data.projectStatus
                ) {

                    const status =
                        quality.data
                            .projectStatus.status;

                    await logger.info(
                        deploymentId,
                        "SONARQUBE",
                        `Quality Gate status: ${status}`,
                        projectName
                    );

                    return await this.metrics(
                        deploymentId,
                        projectKey,
                        projectName,
                        status
                    );
                }

            } catch (error) {

                if (i === 19) {

                    throw new Error(
                        "SonarQube timeout - analysis not ready"
                    );
                }

                continue;
            }
        }

        throw new Error(
            "SonarQube timeout"
        );
    }

    async metrics(
        deploymentId,
        projectKey,
        projectName,
        status
    ) {

        try {

            const response =
                await axios.get(
                    `${process.env.SONAR_URL}/api/measures/component`,
                    {
                        params: {
                            component:
                                projectKey,

                            metricKeys:
                                "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density",
                        },

                        auth: {
                            username:
                                process.env.SONAR_TOKEN,
                            password: "",
                        },
                    }
                );

            const measures = {};

            if (
                response.data &&
                response.data.component &&
                response.data.component.measures
            ) {

                for (
                    const metric of
                    response.data.component.measures
                ) {

                    measures[
                        metric.metric
                    ] =
                        Number(
                            metric.value || 0
                        );
                }
            }

            const result = {

                scanner: "SonarQube",

                passed:
                    status === "OK",

                bugs:
                    measures.bugs || 0,

                vulnerabilities:
                    measures.vulnerabilities || 0,

                codeSmells:
                    measures.code_smells || 0,

                coverage:
                    measures.coverage || 0,

                duplicatedLines:
                    measures.duplicated_lines_density || 0,
            };

            await logger.success(
                deploymentId,
                "SONARQUBE",
                `Quality Gate: ${result.passed ? "PASSED" : "FAILED"} | Bugs:${result.bugs} Vulnerabilities:${result.vulnerabilities} Coverage:${result.coverage}%`,
                projectName
            );

            return result;

        } catch (error) {

            await logger.warning(
                deploymentId,
                "SONARQUBE",
                "SonarQube metrics were not available.",
                projectName
            );

            return {

                scanner: "SonarQube",

                passed:
                    status === "OK",

                bugs: 0,

                vulnerabilities: 0,

                codeSmells: 0,

                coverage: 0,

                duplicatedLines: 0,
            };
        }
    }
}

module.exports =
    new SonarQubeService();