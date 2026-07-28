const jwt = require('jsonwebtoken');
const config = require("../config/env")


const requireAuth = (req, res, next) => {
  const token = req.cookies?.veloplatform_session;

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: Secure session token missing.' });
  }

  try {
    const verifiedUser = jwt.verify(token, config.JWT_SECRET);
    req.user = verifiedUser; // Inject verified user payload (contains userId, githubToken, etc.)
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Access Denied: Session token corrupted or expired.' });
  }
};

// 🌟 BULLETPROOF EXPORT MATRIX:
// Supports both direct function imports AND destructured imports { requireAuth }
module.exports = requireAuth;
module.exports.requireAuth = requireAuth;