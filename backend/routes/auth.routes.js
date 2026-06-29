const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller'); // <-- Verify this dot notation

router.get('/github/callback', authController.gitHubCallback);
router.get('/github/repos/:userId', authController.getGitHubRepositories);

module.exports = router;