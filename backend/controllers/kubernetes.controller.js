const podsService = require("../services/kubernetes/pods.service");
const eventsService = require("../services/kubernetes/events.service");
const replicaSetsService = require("../services/kubernetes/replicasets.service");
const servicesService = require("../services/kubernetes/services.service");
const namespacesService = require("../services/kubernetes/namespaces.service");
const pvcService = require("../services/kubernetes/pvc.service");
const configMapService = require("../services/kubernetes/configmap.service");
const secretService = require("../services/kubernetes/secret.service");
const kubectl = require("../services/kubernetes/kubectl.service");

exports.pods = async (req, res) => {
  res.json(await podsService.list(req.query.namespace));
};

exports.events = async (req, res) => {
  res.json(await eventsService.list(req.query.namespace));
};

exports.replicaSets = async (req, res) => {
  res.json(await replicaSetsService.list(req.query.namespace));
};

exports.services = async (req, res) => {
  res.json(await servicesService.list(req.query.namespace));
};

exports.namespaces = async (req, res) => {
  res.json(await namespacesService.list());
};

exports.pvcs = async (req, res) => {
  res.json(await pvcService.list(req.query.namespace));
};

exports.configMaps = async (req, res) => {
  res.json(await configMapService.list(req.query.namespace));
};

exports.secrets = async (req, res) => {
  res.json(await secretService.list(req.query.namespace));
};

exports.describe = async (req, res) => {
  const result = await kubectl.describe(
    req.params.resource,
    req.params.name,
    req.query.namespace,
  );

  res.send(result);
};

exports.logs = async (req, res) => {
  const result = await kubectl.logs(req.params.name);

  res.send(result);
};

exports.restart = async (req, res) => {
  await kubectl.restart(req.params.name);

  res.json({
    success: true,
  });
};

exports.rollback = async (req, res) => {
  await kubectl.rollback(req.params.name);

  res.json({
    success: true,
  });
};

exports.scale = async (req, res) => {
  await kubectl.scale(
    req.params.name,
    req.body.replicas,
  );

  res.json({
    success: true,
  });
};