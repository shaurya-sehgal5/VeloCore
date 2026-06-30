const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const secureShield = require('../middleware/auth.middleware'); 



router.get('/github/repos/me', secureShield, authController.getGitHubRepositories);
// Expose endpoint for frontend to check cookie validity and get profile tracking context
router.get('/session', secureShield, authController.getAuthenticatedUser); 

module.exports = router;