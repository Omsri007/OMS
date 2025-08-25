// middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');

function authRequired(req, res, next) {
  try {
    // Prefer cookie; fall back to Authorization header
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

module.exports = { authRequired, adminOnly };
