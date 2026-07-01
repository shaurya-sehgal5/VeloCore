const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/auth.middleware');

// GitHub OAuth callback
router.get(
  '/github/callback',
  authController.gitHubCallback
);

// Current logged-in user
router.get(
  '/session',
  requireAuth,
  authController.getAuthenticatedUser
);

// Fetch GitHub repositories
router.get(
  '/github/repos/me',
  requireAuth,
  authController.getGitHubRepositories
);

// Logout
router.post(
  '/logout',
  authController.logout
);

module.exports = router;