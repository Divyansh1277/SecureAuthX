/**
 * Admin Controller – Admin dashboard data and management
 */

const User = require('../models/User');
const LoginLog = require('../models/LoginLog');

/**
 * GET /api/admin/dashboard
 */
function getDashboard(req, res) {
  try {
    const totalUsers = User.getUserCount();
    const roleDistribution = User.getUserCountByRole();
    const loginStats = LoginLog.getStats();
    const recentLogs = LoginLog.getAll(15);
    const loginActivity = LoginLog.getActivityByDate(30);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          successfulLogins: loginStats.success,
          failedLogins: loginStats.failure,
          totalLoginAttempts: loginStats.total
        },
        roleDistribution: roleDistribution.map(r => ({
          role: r.role,
          count: r.count
        })),
        loginActivity,
        recentLogs: recentLogs.map(log => ({
          id: log.id,
          username: log.username,
          action: log.action,
          status: log.status,
          ip: log.ip_address,
          details: log.details,
          timestamp: log.timestamp
        }))
      }
    });

  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load admin dashboard.' });
  }
}

/**
 * GET /api/admin/users
 */
function getAllUsers(req, res) {
  try {
    const users = User.getAllUsers();
    res.status(200).json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        mfaEnabled: !!u.totp_enabled,
        failedAttempts: u.failed_attempts,
        locked: !!(u.locked_until && new Date(u.locked_until + 'Z') > new Date()),
        createdAt: u.created_at,
        lastLogin: u.last_login
      }))
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
}

/**
 * GET /api/admin/logs
 */
function getAllLogs(req, res) {
  try {
    const logs = LoginLog.getAll(100);
    res.status(200).json({
      success: true,
      data: logs.map(log => ({
        id: log.id,
        userId: log.user_id,
        username: log.username,
        action: log.action,
        status: log.status,
        ip: log.ip_address,
        userAgent: log.user_agent,
        details: log.details,
        timestamp: log.timestamp
      }))
    });
  } catch (err) {
    console.error('Get logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to load logs.' });
  }
}

/**
 * GET /api/admin/chart-data
 */
function getChartData(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const loginActivity = LoginLog.getActivityByDate(days);
    const loginStats = LoginLog.getStats();
    const roleDistribution = User.getUserCountByRole();

    res.status(200).json({
      success: true,
      data: {
        loginActivity,
        loginStats,
        roleDistribution
      }
    });
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ success: false, message: 'Failed to load chart data.' });
  }
}

/**
 * DELETE /api/admin/users/:id
 */
function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    const targetUser = User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    if (targetUser.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete an administrator.' });
    }

    User.delete(userId);
    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
}

module.exports = { getDashboard, getAllUsers, getAllLogs, getChartData, deleteUser };
