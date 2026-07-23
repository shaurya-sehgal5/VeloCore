const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs.controller');

router.get('/', logsController.getAllLogs);
router.get('/deployment/:id', logsController.getDeploymentLogs);
router.get('/stage/:stage', logsController.getStageLogs);
router.get('/level/:level', logsController.getLevelLogs);

module.exports = router;