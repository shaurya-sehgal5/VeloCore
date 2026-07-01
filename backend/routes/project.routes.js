const express = require('express');
const router = express.Router();

const projectController = require('../controllers/project.controller');
const secureShield = require('../middleware/auth.middleware');

router.get(
  '/repositories',
  secureShield,
  projectController.getUserRepositories
);

router.post(
  '/deploy',
  secureShield,
  projectController.deployProject
);

module.exports = router;