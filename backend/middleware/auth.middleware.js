const jwt = require('jsonwebtoken');

/**
 * 🔐 SECURITY AUTHENTICATION MIDDLEWARE:
 * Verifies your user session against your system JWT secret key
 */
const requireAuth = (req, res, next) => {
  const token = req.cookies?.veloplatform_session;

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: Secure session token missing.' });
  }

  try {
    const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
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