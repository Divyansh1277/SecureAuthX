/**
 * EmailOtp Model – Database operations for email-based OTP codes
 */

const { dbHelper } = require('../../database/init');

const EmailOtp = {
  create(userId, otpCode, expiresAt) {
    // Invalidate any existing unused OTPs for this user first
    dbHelper.run('UPDATE email_otps SET used = 1 WHERE user_id = ? AND used = 0', [userId]);

    return dbHelper.run(
      'INSERT INTO email_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );
  },

  verify(userId, otpCode) {
    const otp = dbHelper.get(
      `SELECT * FROM email_otps
       WHERE user_id = ? AND otp_code = ? AND used = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, otpCode]
    );

    if (otp) {
      dbHelper.run('UPDATE email_otps SET used = 1 WHERE id = ?', [otp.id]);
      return true;
    }
    return false;
  },

  invalidateAll(userId) {
    dbHelper.run('UPDATE email_otps SET used = 1 WHERE user_id = ? AND used = 0', [userId]);
  }
};

module.exports = EmailOtp;
