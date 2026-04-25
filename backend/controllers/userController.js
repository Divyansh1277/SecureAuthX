/**
 * User Controller – User dashboard data
 */

const User = require('../models/User');
const LoginLog = require('../models/LoginLog');

/**
 * GET /api/user/dashboard
 */
function getDashboard(req, res) {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const totalLogins = LoginLog.getUserLoginCount(user.id);
    const recentLogs = LoginLog.getByUserId(user.id, 10);
    const loginActivity = LoginLog.getUserActivityByDate(user.id, 7);

    // Calculate security score
    let securityScore = 40; // base
    if (user.totp_enabled) securityScore += 30;
    if (user.failed_attempts === 0) securityScore += 15;
    if (user.last_login) securityScore += 15;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          mfaEnabled: !!user.totp_enabled,
          createdAt: user.created_at,
          lastLogin: user.last_login
        },
        stats: {
          totalLogins,
          securityScore: Math.min(securityScore, 100),
          failedAttempts: user.failed_attempts,
          mfaStatus: user.totp_enabled ? 'Enabled' : 'Disabled'
        },
        loginActivity,
        recentLogs: recentLogs.map(log => ({
          id: log.id,
          action: log.action,
          status: log.status,
          ip: log.ip_address,
          userAgent: log.user_agent,
          details: log.details,
          timestamp: log.timestamp
        }))
      }
    });

  } catch (err) {
    console.error('User dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
}

/**
 * GET /api/user/login-history
 */
function getLoginHistory(req, res) {
  try {
    const logs = LoginLog.getByUserId(req.user.id, 50);
    res.status(200).json({
      success: true,
      data: logs.map(log => ({
        id: log.id,
        action: log.action,
        status: log.status,
        ip: log.ip_address,
        userAgent: log.user_agent,
        details: log.details,
        timestamp: log.timestamp
      }))
    });
  } catch (err) {
    console.error('Login history error:', err);
    res.status(500).json({ success: false, message: 'Failed to load login history.' });
  }
}

/**
 * GET /api/user/security-status
 */
function getSecurityStatus(req, res) {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      data: {
        mfaEnabled: !!user.totp_enabled,
        failedAttempts: user.failed_attempts,
        accountLocked: !!(user.locked_until && new Date(user.locked_until + 'Z') > new Date()),
        lastLogin: user.last_login,
        passwordStrength: 'strong', // Already validated at signup
        accountAge: user.created_at
      }
    });
  } catch (err) {
    console.error('Security status error:', err);
    res.status(500).json({ success: false, message: 'Failed to load security status.' });
  }
}

module.exports = { getDashboard, getLoginHistory, getSecurityStatus };
