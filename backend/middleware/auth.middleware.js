const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Extract token directly from the incoming cookies container array
  const token = req.cookies?.veloplatform_session;

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: Secure session token context missing.' });
  }

  try {
    // Cryptographically verify the token signature using our system environment key
    const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
    
    // Inject the validated user context parameters directly into the running request block execution lifecycle
    req.user = verifiedUser;
    
    // Proceed to the next execution node controller without interruption
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Access Denied: Session token corrupted or expired.' });
  }
};