/**
 * Auth Routes – Signup, Login, MFA, OTP
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', loginLimiter, authController.login);
router.post('/verify-totp', otpLimiter, authController.verifyTotp);
router.post('/send-email-otp', otpLimiter, authController.sendEmailOtp);
router.post('/verify-email-otp', otpLimiter, authController.verifyEmailOtp);
router.post('/setup-totp', authController.setupTotp);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', otpLimiter, authController.resetPassword);
router.post('/logout', authController.logout);

module.exports = router;
