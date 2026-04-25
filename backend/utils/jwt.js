/**
 * JWT Utility – Token generation and verification
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const JWT_EXPIRY = '1h';

const jwtUtil = {
  /**
   * Generate a JWT token
   */
  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  },

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  }
};

module.exports = jwtUtil;
