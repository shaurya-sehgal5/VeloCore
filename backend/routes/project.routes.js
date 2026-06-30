const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const secureShield = require('../middleware/auth.middleware'); 

router.post('/deploy', secureShield, projectController.triggerDeployment);

module.exports = router;