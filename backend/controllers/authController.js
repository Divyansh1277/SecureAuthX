/**
 * Auth Controller – Signup, Login, MFA, OTP flows
 */

const bcrypt = require('bcrypt');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const EmailOtp = require('../models/EmailOtp');
const jwtUtil = require('../utils/jwt');
const totpUtil = require('../utils/totp');
const { sendOTP } = require('../utils/email');
const validators = require('../utils/validators');

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

/**
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    let { username, email, password, confirmPassword, role, adminCode } = req.body;

    // Sanitize inputs (buffer overflow prevention)
    username = validators.sanitizeInput(username, 30);
    email = validators.sanitizeInput(email, 254);
    password = validators.sanitizeInput(password, 128);

    // Validate username
    if (!validators.validateUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters (letters, numbers, underscores only).'
      });
    }

    // Validate email
    if (!validators.validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Validate password
    const passwordCheck = validators.validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements.',
        feedback: passwordCheck.feedback
      });
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    // Check if user already exists
    if (User.findByUsername(username)) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists.'
      });
    }

    if (User.findByEmail(email)) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // Handle admin role request
    let assignedRole = 'user';
    if (role === 'admin') {
      if (adminCode !== process.env.ADMIN_SETUP_CODE) {
        return res.status(403).json({
          success: false,
          message: 'Invalid admin setup code.'
        });
      }
      assignedRole = 'admin';
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const newUser = User.create({ username, email, passwordHash, role: assignedRole });

    // Generate TOTP secret
    const secret = totpUtil.generateSecret(username);
    User.updateTotpSecret(newUser.id, secret.base32);

    // Generate QR code
    const qrCode = await totpUtil.generateQRCode(secret.otpauthUrl);

    // Log activity
    LoginLog.create({
      userId: newUser.id,
      username,
      action: 'signup',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `New ${assignedRole} account created`
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please set up MFA.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: assignedRole
      },
      mfa: {
        qrCode,
        secret: secret.base32,
        otpauthUrl: secret.otpauthUrl
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred during signup.'
    });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    let { username, password } = req.body;

    // Allow login with username or email
    const loginIdentifier = validators.sanitizeInput(username, 254);
    password = validators.sanitizeInput(password, 128);

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required.'
      });
    }

    // Find user by username or email
    let user;
    if (loginIdentifier.includes('@')) {
      user = User.findByEmail(loginIdentifier);
    } else {
      user = User.findByUsername(loginIdentifier);
    }

    if (!user) {
      // Log failed attempt for non-existent user
      LoginLog.create({
        userId: null,
        username: loginIdentifier,
        action: 'login',
        status: 'failure',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: 'User not found'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        attemptsRemaining: MAX_FAILED_ATTEMPTS
      });
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockTime = new Date(user.locked_until + 'Z');
      const now = new Date();

      if (lockTime > now) {
        const remainingMs = lockTime - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);

        LoginLog.create({
          userId: user.id,
          username,
          action: 'login',
          status: 'failure',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          details: 'Account locked'
        });

        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${remainingMinutes} minute(s).`,
          lockedUntil: user.locked_until,
          remainingMinutes
        });
      } else {
        // Lock has expired, reset
        User.resetFailedAttempts(user.id);
      }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const failCount = User.incrementFailedAttempts(user.id);

      LoginLog.create({
        userId: user.id,
        username,
        action: 'login',
        status: 'failure',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Invalid password (attempt ${failCount}/${MAX_FAILED_ATTEMPTS})`
      });

      // Lock account after max attempts
      if (failCount >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000).toISOString().replace('T', ' ').split('.')[0];
        User.lockAccount(user.id, lockUntil);

        return res.status(423).json({
          success: false,
          message: `Account locked for ${LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`,
          remainingMinutes: LOCK_DURATION_MINUTES,
          attemptsRemaining: 0
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
        attemptsRemaining: MAX_FAILED_ATTEMPTS - failCount
      });
    }

    // Password is correct – check if TOTP is enabled
    if (user.totp_enabled) {
      // Generate a temporary token for MFA verification
      const tempToken = jwtUtil.generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        mfaPending: true
      });

      return res.status(200).json({
        success: true,
        mfaRequired: true,
        message: 'Password verified. Please enter your MFA code.',
        tempToken,
        userId: user.id
      });
    }

    // No MFA – issue full token
    User.resetFailedAttempts(user.id);
    User.updateLastLogin(user.id);

    const token = jwtUtil.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    LoginLog.create({
      userId: user.id,
      username,
      action: 'login',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Login without MFA'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login.'
    });
  }
}

/**
 * POST /api/auth/verify-totp
 */
function verifyTotp(req, res) {
  try {
    let { token, tempToken, userId } = req.body;
    token = validators.sanitizeInput(token, 6);

    if (!validators.validateOtp(token)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit code.'
      });
    }

    // Verify the temp token
    const decoded = jwtUtil.verifyToken(tempToken);
    if (!decoded || !decoded.mfaPending) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please log in again.'
      });
    }

    const user = User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Verify TOTP
    const isValid = totpUtil.verifyToken(user.totp_secret, token);
    if (!isValid) {
      LoginLog.create({
        userId: user.id,
        username: user.username,
        action: 'totp_verify',
        status: 'failure',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: 'Invalid TOTP code'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // TOTP valid – issue full token
    User.resetFailedAttempts(user.id);
    User.updateLastLogin(user.id);

    const fullToken = jwtUtil.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    LoginLog.create({
      userId: user.id,
      username: user.username,
      action: 'login',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Login with TOTP MFA'
    });

    res.status(200).json({
      success: true,
      message: 'MFA verification successful!',
      token: fullToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('TOTP verify error:', err);
    res.status(500).json({
      success: false,
      message: 'Verification failed.'
    });
  }
}

/**
 * POST /api/auth/send-email-otp
 */
async function sendEmailOtp(req, res) {
  try {
    const { tempToken } = req.body;

    const decoded = jwtUtil.verifyToken(tempToken);
    if (!decoded || !decoded.mfaPending) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please log in again.'
      });
    }

    const user = User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString().replace('T', ' ').split('.')[0];

    // Store OTP
    EmailOtp.create(user.id, otp, expiresAt);

    // Send email
    const result = await sendOTP(user.email, otp, user.username);

    LoginLog.create({
      userId: user.id,
      username: user.username,
      action: 'email_otp_sent',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `OTP sent to ${user.email}`
    });

    res.status(200).json({
      success: true,
      message: `Code sent to ${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`,
      previewUrl: result.previewUrl || null  // Ethereal preview in dev
    });

  } catch (err) {
    console.error('Send email OTP error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code.'
    });
  }
}

/**
 * POST /api/auth/verify-email-otp
 */
function verifyEmailOtp(req, res) {
  try {
    let { otp, tempToken } = req.body;
    otp = validators.sanitizeInput(otp, 6);

    if (!validators.validateOtp(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit code.'
      });
    }

    const decoded = jwtUtil.verifyToken(tempToken);
    if (!decoded || !decoded.mfaPending) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please log in again.'
      });
    }

    const user = User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Verify email OTP
    const isValid = EmailOtp.verify(user.id, otp);
    if (!isValid) {
      LoginLog.create({
        userId: user.id,
        username: user.username,
        action: 'email_otp_verify',
        status: 'failure',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: 'Invalid email OTP'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    // OTP valid – issue full token
    User.resetFailedAttempts(user.id);
    User.updateLastLogin(user.id);

    const fullToken = jwtUtil.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    LoginLog.create({
      userId: user.id,
      username: user.username,
      action: 'login',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Login with Email OTP MFA'
    });

    res.status(200).json({
      success: true,
      message: 'Verification successful!',
      token: fullToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Email OTP verify error:', err);
    res.status(500).json({
      success: false,
      message: 'Verification failed.'
    });
  }
}

/**
 * POST /api/auth/setup-totp
 */
async function setupTotp(req, res) {
  try {
    const { userId, token } = req.body;

    if (!validators.validateOtp(token)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit code to verify setup.'
      });
    }

    const user = User.findById(userId);
    if (!user || !user.totp_secret) {
      return res.status(404).json({
        success: false,
        message: 'User or TOTP secret not found.'
      });
    }

    // Verify the TOTP code to confirm setup
    const isValid = totpUtil.verifyToken(user.totp_secret, token);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code. Please scan the QR code and try again.'
      });
    }

    // Enable TOTP
    User.enableTotp(user.id);

    LoginLog.create({
      userId: user.id,
      username: user.username,
      action: 'mfa_setup',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'TOTP MFA enabled'
    });

    res.status(200).json({
      success: true,
      message: 'MFA has been enabled successfully!'
    });

  } catch (err) {
    console.error('TOTP setup error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to set up MFA.'
    });
  }
}


/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    let { email } = req.body;
    email = validators.sanitizeInput(email, 254);

    if (!email || !validators.validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const user = User.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset code has been sent.'
      });
    }

    // Generate 6-digit OTP for password reset
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString().replace('T', ' ').split('.')[0];

    // Store OTP (reuse email_otps table)
    EmailOtp.create(user.id, otp, expiresAt);

    // Send reset email
    await sendOTP(user.email, otp, user.username);

    LoginLog.create({
      userId: user.id,
      username: user.username,
      action: 'forgot_password',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Password reset OTP sent to ${user.email}`
    });

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
      maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again later.'
    });
  }
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    let { email, otp, newPassword, confirmPassword } = req.body;

    email = validators.sanitizeInput(email, 254);
    otp = validators.sanitizeInput(otp, 6);
    newPassword = validators.sanitizeInput(newPassword, 128);

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    if (!validators.validateOtp(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit code.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const passwordCheck = validators.validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements.',
        feedback: passwordCheck.feedback
      });
    }

    const user = User.findByEmail(email);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset request.'
      });
    }

    // Verify OTP
    const isValid = EmailOtp.verify(user.id, otp);
    if (!isValid) {
      LoginLog.create({
        userId: user.id,
        username: user.username,
        action: 'reset_password',
        status: 'failure',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: 'Invalid or expired reset code'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset code.'
      });
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    User.updatePassword(user.id, passwordHash);
    User.resetFailedAttempts(user.id);

    LoginLog.create({
      userId: user.id,
      username: user.username,
      action: 'reset_password',
      status: 'success',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Password reset successfully'
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.'
    });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again later.'
    });
  }
}

/**
 * POST /api/auth/logout
 */
function logout(req, res) {
  res.clearCookie('token');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

module.exports = {
  signup,
  login,
  verifyTotp,
  sendEmailOtp,
  verifyEmailOtp,
  setupTotp,
  forgotPassword,
  resetPassword,
  logout
};
