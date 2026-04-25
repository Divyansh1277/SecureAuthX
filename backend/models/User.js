/**
 * User Model – Database operations for users
 * All queries use parameterized statements to prevent SQL injection
 */

const { dbHelper } = require('../../database/init');

const User = {
  findByUsername(username) {
    return dbHelper.get('SELECT * FROM users WHERE username = ?', [username]);
  },

  findByEmail(email) {
    return dbHelper.get('SELECT * FROM users WHERE email = ?', [email]);
  },

  findById(id) {
    return dbHelper.get('SELECT * FROM users WHERE id = ?', [id]);
  },

  create({ username, email, passwordHash, role = 'user' }) {
    const result = dbHelper.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );
    return { id: result.lastInsertRowid, username, email, role };
  },

  updateTotpSecret(id, secret) {
    dbHelper.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, id]);
  },

  enableTotp(id) {
    dbHelper.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [id]);
  },

  disableTotp(id) {
    dbHelper.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [id]);
  },

  incrementFailedAttempts(id) {
    const user = dbHelper.get('SELECT failed_attempts FROM users WHERE id = ?', [id]);
    const newCount = (user?.failed_attempts || 0) + 1;
    dbHelper.run('UPDATE users SET failed_attempts = ? WHERE id = ?', [newCount, id]);
    return newCount;
  },

  resetFailedAttempts(id) {
    dbHelper.run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [id]);
  },

  lockAccount(id, until) {
    dbHelper.run('UPDATE users SET locked_until = ? WHERE id = ?', [until, id]);
  },

  updateLastLogin(id) {
    dbHelper.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [id]);
  },

  updatePassword(id, passwordHash) {
    dbHelper.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },

  getAllUsers() {
    return dbHelper.all(`
      SELECT id, username, email, role, totp_enabled, failed_attempts,
             locked_until, created_at, last_login
      FROM users ORDER BY created_at DESC
    `);
  },

  getUserCount() {
    const row = dbHelper.get('SELECT COUNT(*) as count FROM users');
    return row ? row.count : 0;
  },

  getUserCountByRole() {
    return dbHelper.all('SELECT role, COUNT(*) as count FROM users GROUP BY role');
  },

  delete(id) {
    dbHelper.run('DELETE FROM users WHERE id = ?', [id]);
  }
};

module.exports = User;
