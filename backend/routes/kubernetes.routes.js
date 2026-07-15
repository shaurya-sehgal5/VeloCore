const router = require("express").Router();

const controller = require("../controllers/kubernetes.controller");

router.get("/k8s/pods", controller.pods);

router.get("/k8s/events", controller.events);

router.get("/k8s/services", controller.services);

router.get("/k8s/replicasets", controller.replicaSets);

router.get("/k8s/namespaces", controller.namespaces);

router.get("/k8s/pvcs", controller.pvcs);

router.get("/k8s/configmaps", controller.configMaps);

router.get("/k8s/secrets", controller.secrets);

router.get(
  "/k8s/:resource/:name/describe",
  controller.describe,
);

router.get(
  "/k8s/pod/:name/logs",
  controller.logs,
);

router.post(
  "/k8s/deployment/:name/restart",
  controller.restart,
);

router.post(
  "/k8s/deployment/:name/rollback",
  controller.rollback,
);

router.post(
  "/k8s/deployment/:name/scale",
  controller.scale,
);

module.exports = router;