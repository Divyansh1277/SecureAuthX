/**
 * Rate Limiter Middleware
 * Protects login endpoint from brute force attacks
 */

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 login attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// OTP verification limiter
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.'
  }
});

module.exports = { apiLimiter, loginLimiter, otpLimiter };
