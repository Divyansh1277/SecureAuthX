/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

const jwtUtil = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authenticate – verify JWT from header or cookie
 */
function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const decoded = jwtUtil.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.'
      });
    }

    // Verify user still exists
    const user = User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
}

/**
 * Require a specific role
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
}

module.exports = { authenticate, requireRole };
