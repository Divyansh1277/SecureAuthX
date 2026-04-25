/**
 * LoginLog Model – Database operations for login attempt logging
 */

const { dbHelper } = require('../../database/init');

const LoginLog = {
  create({ userId, username, action, status, ip, userAgent, details }) {
    return dbHelper.run(
      `INSERT INTO login_logs (user_id, username, action, status, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, username, action, status, ip || 'unknown', userAgent || 'unknown', details || null]
    );
  },

  getByUserId(userId, limit = 20) {
    return dbHelper.all(
      'SELECT * FROM login_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
  },

  getAll(limit = 50) {
    return dbHelper.all(
      'SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  },

  getStats() {
    const total = dbHelper.get('SELECT COUNT(*) as count FROM login_logs');
    const success = dbHelper.get("SELECT COUNT(*) as count FROM login_logs WHERE status = 'success'");
    const failure = dbHelper.get("SELECT COUNT(*) as count FROM login_logs WHERE status = 'failure'");
    return {
      total: total ? total.count : 0,
      success: success ? success.count : 0,
      failure: failure ? failure.count : 0
    };
  },

  getActivityByDate(days = 7) {
    return dbHelper.all(
      `SELECT DATE(timestamp) as date,
              SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
              SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failure_count,
              COUNT(*) as total_count
       FROM login_logs
       WHERE timestamp >= datetime('now', ?)
       GROUP BY DATE(timestamp)
       ORDER BY date ASC`,
      [`-${days} days`]
    );
  },

  getUserActivityByDate(userId, days = 7) {
    return dbHelper.all(
      `SELECT DATE(timestamp) as date,
              SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
              SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failure_count,
              COUNT(*) as total_count
       FROM login_logs
       WHERE user_id = ? AND timestamp >= datetime('now', ?)
       GROUP BY DATE(timestamp)
       ORDER BY date ASC`,
      [userId, `-${days} days`]
    );
  },

  getUserLoginCount(userId) {
    const row = dbHelper.get(
      "SELECT COUNT(*) as count FROM login_logs WHERE user_id = ? AND status = 'success'",
      [userId]
    );
    return row ? row.count : 0;
  }
};

module.exports = LoginLog;
