const db = require("../../config/db");
const logger = require("../monitoring/logger.service");
const metrics = require("../monitoring/metrics.service");

class RuntimeRegistryService {
  async register(runtime) {
    /*
    ==================================================
    NORMALIZE RUNTIME
    ==================================================
    */

    const {
      deploymentId,
      project,
      name: runtimeName,

      type,
      framework,
      imageName = null,
      containerName = null,
      route = null,
      containerPort = null,

      slot,
      engine = "docker",
      namespace = "default",

      deployment = null,
      service = null,
      pod = null,
      host = null,
    } = runtime || {};

    /*
    ==================================================
    REQUIRED VALUES
    ==================================================
    */

    const name =
      runtimeName ||
      project ||
      null;

    if (!deploymentId) {
      throw new Error(
        "Runtime registration failed: deploymentId is missing."
      );
    }

    if (!name) {
      throw new Error(
        "Runtime registration failed: runtime name is missing."
      );
    }

    if (!type) {
      throw new Error(
        `Runtime registration failed for ${name}: runtime type is missing.`
      );
    }

    /*
    ==================================================
    REMOVE PREVIOUS RUNTIME
    ==================================================
    */

    await db.query(
      `
      DELETE FROM deployment_services
      WHERE deployment_id = $1
      AND name = $2
      `,
      [
        deploymentId,
        name,
      ]
    );

    /*
    ==================================================
    REGISTER RUNTIME
    ==================================================
    */

    await db.query(
      `
      INSERT INTO deployment_services (
        deployment_id,
        name,
        type,
        framework,
        image_name,
        container_name,
        route,
        container_port,
        status,
        slot,
        engine,
        namespace,
        deployment_name,
        service_name,
        host
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'RUNNING',
        $9,
        $10,
        $11,
        $12,
        $13,
        $14
      )
      `,
      [
        deploymentId,
        name,
        type,
        framework,
        imageName,
        containerName || pod,
        route,
        containerPort,
        slot,
        engine,
        namespace,
        deployment,
        service,
        host,
      ]
    );

    /*
    ==================================================
    SUCCESS
    ==================================================
    */

    await logger.success(
      deploymentId,
      "RUNTIME",
      `Registered ${name}`,
      name
    );

    metrics.runtimeEvents.inc({
      action: "START",
    });

    return {
      deploymentId,
      name,
      type,
      framework,
      route,
      containerPort,
      engine,
      namespace,
      deployment,
      service,
      pod,
      host,
    };
  }
}

module.exports =
  new RuntimeRegistryService();